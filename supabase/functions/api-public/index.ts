import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ───────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Content-Type': 'application/json',
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders })
}

function errorResponse(error: string, status: number, details?: string) {
  return new Response(
    JSON.stringify({ error, ...(details ? { details } : {}) }),
    { status, headers: corsHeaders },
  )
}

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function cleanCnpj(raw: string): string {
  return raw.replace(/\D/g, '').padStart(14, '0')
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number(value ?? fallback)
  if (isNaN(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}

function nullIfEmpty(val: string | null): string | null {
  if (!val) return null
  const trimmed = val.trim()
  return trimmed.length > 0 ? trimmed : null
}

// ─── Rate-limiter (in-memory, per-key, per-minute) ──────────────────────────
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(apiKeyId: string, limit: number): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(apiKeyId)

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(apiKeyId, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (bucket.count >= limit) return false
  bucket.count++
  return true
}

// ─── Route handlers ─────────────────────────────────────────────────────────

async function handleMe(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  apiKeyId: string,
) {
  // Get profile + plan info
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, plan_id, extra_credits, plan_start_date, status, monthly_limit_override')
    .eq('user_id', userId)
    .single()

  const planId = profile?.plan_id || 'free'

  const { data: plan } = await supabase
    .from('plans')
    .select('name, monthly_company_limit, price_monthly, price_yearly, can_export, max_users, features')
    .eq('id', planId)
    .single()

  // Get active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, billing_cycle, current_period_start, current_period_end, price')
    .eq('user_id', userId)
    .in('status', ['ACTIVE', 'PENDING'])
    .order('created_at', { ascending: false })
    .limit(1)

  // Count unlocks within the current billing cycle (same logic as web panel and /unlock endpoint)
  // Uses billing_cycle_end >= now to count active/valid unlocks, not calendar month
  const now = new Date()

  const { count: monthlyUnlocks } = await supabase
    .from('unlocked_companies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('billing_cycle_end', now.toISOString())

  // Count total unlocks ever
  const { count: totalUnlocks } = await supabase
    .from('unlocked_companies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Get API key info
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('name, permissions, rate_limit, total_requests, last_used_at, created_at, expires_at')
    .eq('id', apiKeyId)
    .single()

  const monthlyLimit = profile?.monthly_limit_override || plan?.monthly_company_limit || 10
  const used = monthlyUnlocks || 0
  const extraCredits = profile?.extra_credits || 0
  const remaining = Math.max(0, monthlyLimit - used)

  return {
    data: {
      user: {
        name: profile?.name || null,
        status: profile?.status || 'active',
      },
      plan: {
        id: planId,
        name: plan?.name || planId,
        monthly_limit: monthlyLimit,
        can_export: plan?.can_export || false,
        max_users: plan?.max_users || 1,
        features: plan?.features || [],
      },
      subscription: subscription?.length ? {
        status: subscription[0].status,
        billing_cycle: subscription[0].billing_cycle,
        current_period_start: subscription[0].current_period_start,
        current_period_end: subscription[0].current_period_end,
        price: subscription[0].price,
      } : null,
      credits: {
        monthly_limit: monthlyLimit,
        used_this_month: used,
        remaining_this_month: remaining,
        extra_credits: extraCredits,
        total_available: remaining + extraCredits,
      },
      usage: {
        unlocks_this_month: used,
        unlocks_total: totalUnlocks || 0,
      },
      api_key: {
        name: apiKey?.name || null,
        permissions: apiKey?.permissions || [],
        rate_limit: apiKey?.rate_limit || 100,
        total_requests: apiKey?.total_requests || 0,
        last_used_at: apiKey?.last_used_at || null,
        created_at: apiKey?.created_at || null,
        expires_at: apiKey?.expires_at || null,
      },
    },
    status: 200,
  }
}

async function handleHealth() {
  return {
    data: {
      status: 'ok',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      endpoints: ['/health', '/me', '/empresas', '/socios', '/cnaes', '/unlock'],
      filters: {
        empresas: [
          'cnpj', 'uf', 'municipio', 'cnae', 'search', 'sit_cadastral',
          'porte', 'simples', 'mei', 'matriz_filial', 'has_email',
          'has_phone', 'has_socios', 'data_abertura_inicio', 'data_abertura_fim',
          'limit', 'offset',
        ],
      },
    },
    status: 200,
  }
}

async function handleEmpresas(
  url: URL,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const cnpj = url.searchParams.get('cnpj')

  // ── Single CNPJ lookup ──
  if (cnpj) {
    const cleaned = cleanCnpj(cnpj)
    if (cleaned.length !== 14) {
      return { data: { error: 'CNPJ inválido — deve conter 14 dígitos' }, status: 400 }
    }

    // Check if user has unlocked this company
    const { data: unlockData } = await supabase
      .from('unlocked_companies')
      .select('id')
      .eq('user_id', userId)
      .eq('empresa_cnpj', cleaned)
      .gte('billing_cycle_end', new Date().toISOString())
      .limit(1)

    // Also check team unlock (if user is a team member)
    let teamUnlocked = false
    if (!unlockData?.length) {
      const { data: teamData } = await supabase
        .from('team_members')
        .select('owner_user_id')
        .eq('member_user_id', userId)
        .eq('status', 'ACTIVE')
        .limit(1)

      if (teamData?.length) {
        const { data: ownerUnlock } = await supabase
          .from('unlocked_companies')
          .select('id')
          .eq('user_id', teamData[0].owner_user_id)
          .eq('empresa_cnpj', cleaned)
          .gte('billing_cycle_end', new Date().toISOString())
          .limit(1)
        teamUnlocked = !!ownerUnlock?.length
      }
    }

    const isUnlocked = !!unlockData?.length || teamUnlocked

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: userId })

    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('cnpj', cleaned)
      .single()

    if (error || !data) {
      return { data: { error: 'Empresa não encontrada', cnpj: cleaned }, status: 404 }
    }

    // If NOT unlocked and NOT admin, return restricted data (same as panel)
    if (!isUnlocked && !isAdmin) {
      const restricted = {
        id: data.id,
        sit_cadastral: data.sit_cadastral,
        data_sit_cadastral: data.data_sit_cadastral,
        data_inicio_atividade: data.data_inicio_atividade,
        cnae_fiscal: data.cnae_fiscal,
        cnae_codigo: data.cnae_codigo,
        uf: data.uf,
        municipio: data.municipio,
        porte_empresa: data.porte_empresa,
        opcao_simples: data.opcao_simples,
        opcao_mei: data.opcao_mei,
        matriz_filial: data.matriz_filial,
        capital_social_empresa: data.capital_social_empresa,
        categoria_id: data.categoria_id,
        tags: data.tags,
        has_email: !!(data.email || data.correio_eletronico),
        has_phone: !!(data.ddd_telefone_1 || data.ddd_telefone_2),
        has_socios: !!(data.socios && data.socios !== ''),
        is_unlocked: false,
      }
      return {
        data: {
          data: restricted,
          message: 'Empresa não desbloqueada. Use POST /unlock com empresa_id ou cnpj para desbloquear e ver dados completos.',
        },
        status: 200,
      }
    }

    return { data: { data: { ...data, is_unlocked: true } }, status: 200 }
  }

  // ── List with filters — uses optimized RPC with statement_timeout ──
  const limit = clampInt(url.searchParams.get('limit'), 25, 1, 100)
  const offset = clampInt(url.searchParams.get('offset'), 0, 0, 1_000_000)

  const uf = nullIfEmpty(url.searchParams.get('uf'))?.toUpperCase() ?? null
  const municipio = nullIfEmpty(url.searchParams.get('municipio'))
  const cnae = nullIfEmpty(url.searchParams.get('cnae'))
  const search = nullIfEmpty(url.searchParams.get('search'))
  const sit_cadastral = nullIfEmpty(url.searchParams.get('sit_cadastral'))
  const porte = nullIfEmpty(url.searchParams.get('porte'))
  const simples = nullIfEmpty(url.searchParams.get('simples'))
  const mei = nullIfEmpty(url.searchParams.get('mei'))
  const matriz_filial = nullIfEmpty(url.searchParams.get('matriz_filial'))
  const has_email = url.searchParams.get('has_email') === 'true' ? true : null
  const has_phone = url.searchParams.get('has_phone') === 'true' ? true : null
  const has_socios = url.searchParams.get('has_socios') === 'true' ? true : null
  const data_abertura_inicio = nullIfEmpty(url.searchParams.get('data_abertura_inicio'))
  const data_abertura_fim = nullIfEmpty(url.searchParams.get('data_abertura_fim'))
  const busca_socio = nullIfEmpty(url.searchParams.get('busca_socio'))

  // Validate search length
  if (search && search.length < 2) {
    return { data: { error: 'Parâmetro search deve ter pelo menos 2 caracteres' }, status: 400 }
  }
  if (busca_socio && busca_socio.length < 3) {
    return { data: { error: 'Parâmetro busca_socio deve ter pelo menos 3 caracteres' }, status: 400 }
  }

  // No filters at all — require at least one to avoid full table scan
  const hasAnyFilter = uf || municipio || cnae || search || sit_cadastral || porte ||
    simples || mei || matriz_filial || has_email || has_phone || has_socios ||
    data_abertura_inicio || data_abertura_fim || busca_socio

  if (!hasAnyFilter) {
    return {
      data: {
        error: 'Pelo menos um filtro é obrigatório para listar empresas',
        message: 'Use filtros como uf, municipio, cnae, search, sit_cadastral, porte, simples, mei, matriz_filial, has_email, has_phone, has_socios, data_abertura_inicio, data_abertura_fim ou busca_socio.',
        available_filters: [
          'uf', 'municipio', 'cnae', 'search', 'sit_cadastral', 'porte',
          'simples', 'mei', 'matriz_filial', 'has_email', 'has_phone',
          'has_socios', 'data_abertura_inicio', 'data_abertura_fim', 'busca_socio',
        ],
      },
      status: 400,
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_empresas_public', {
      p_limit: limit,
      p_offset: offset,
      p_uf: uf,
      p_municipio: municipio,
      p_cnae: cnae,
      p_search: search,
      p_sit_cadastral: sit_cadastral,
      p_porte: porte,
      p_simples: simples,
      p_mei: mei,
      p_matriz_filial: matriz_filial,
      p_has_email: has_email,
      p_has_phone: has_phone,
      p_has_socios: has_socios,
      p_data_abertura_inicio: data_abertura_inicio,
      p_data_abertura_fim: data_abertura_fim,
      p_busca_socio: busca_socio,
    })

    if (error) {
      console.error('Empresas RPC error:', error.message)
      if (error.message?.includes('timeout') || error.message?.includes('canceling statement')) {
        return {
          data: {
            error: 'Consulta excedeu o tempo limite (25s)',
            message: 'Combine filtros mais específicos para reduzir o volume. Exemplo: uf + municipio + cnae.',
            suggestion: 'Evite buscar apenas por search sem outros filtros em bases com milhões de registros.',
          },
          status: 504,
        }
      }
      return { data: { error: 'Erro na consulta', details: error.message }, status: 500 }
    }

    const rows = data ?? []
    const total = rows.length > 0 ? (rows[0] as Record<string, unknown>).total_count as number : 0

    // Clean response — remove total_count from each row
    const cleanRows = rows.map((row: Record<string, unknown>) => {
      const { total_count, ...rest } = row
      return rest
    })

    return {
      data: {
        data: cleanRows,
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total,
          next_offset: offset + limit < total ? offset + limit : null,
        },
      },
      status: 200,
    }
  } catch (err) {
    console.error('Empresas unexpected error:', err)
    return { data: { error: 'Erro inesperado na consulta' }, status: 500 }
  }
}

async function handleUnlock(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  if (req.method !== 'POST') {
    return { data: { error: 'Método não permitido. Use POST.' }, status: 405 }
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return { data: { error: 'Body JSON inválido' }, status: 400 }
  }

  const empresaId = body.empresa_id ? Number(body.empresa_id) : null
  const empresaCnpj = body.cnpj ? cleanCnpj(String(body.cnpj)) : null

  if (!empresaId && !empresaCnpj) {
    return { data: { error: 'Informe empresa_id ou cnpj no body' }, status: 400 }
  }

  // Find empresa
  let empresa: Record<string, unknown> | null = null
  if (empresaCnpj) {
    const { data } = await supabase.from('empresas').select('*').eq('cnpj', empresaCnpj).single()
    empresa = data
  } else if (empresaId) {
    const { data } = await supabase.from('empresas').select('*').eq('id', empresaId).single()
    empresa = data
  }

  if (!empresa) {
    return { data: { error: 'Empresa não encontrada' }, status: 404 }
  }

  const normalizedCnpj = empresa.cnpj as string

  // Already unlocked?
  const { data: existingUnlock } = await supabase
    .from('unlocked_companies')
    .select('id, billing_cycle_end')
    .eq('user_id', userId)
    .eq('empresa_cnpj', normalizedCnpj)
    .gte('billing_cycle_end', new Date().toISOString())
    .limit(1)

  if (existingUnlock?.length) {
    return {
      data: {
        message: 'Empresa já desbloqueada',
        already_unlocked: true,
        unlock_expires: existingUnlock[0].billing_cycle_end,
        data: empresa,
      },
      status: 200,
    }
  }

  // Check plan limits
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_id, extra_credits, plan_start_date, monthly_limit_override')
    .eq('user_id', userId)
    .single()

  const planId = profile?.plan_id || 'free'

  const { data: plan } = await supabase
    .from('plans')
    .select('monthly_company_limit')
    .eq('id', planId)
    .single()

  // monthly_limit_override takes precedence over plan limit
  const monthlyLimit = profile?.monthly_limit_override || plan?.monthly_company_limit || 10

  const now = new Date()

  // Count active unlocks within the current billing cycle (not expired yet)
  // This matches the same logic used in the web panel (CreditContext)
  const { count: currentMonthUnlocks } = await supabase
    .from('unlocked_companies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('billing_cycle_end', now.toISOString())

  const usedCredits = currentMonthUnlocks || 0
  const extraCredits = profile?.extra_credits || 0
  let usedExtraCredit = false

  if (usedCredits >= monthlyLimit) {
    if (extraCredits <= 0) {
      return {
        data: {
          error: 'Limite mensal atingido',
          message: `Limite de ${monthlyLimit} empresas/mês atingido. Sem créditos extras.`,
          used: usedCredits,
          limit: monthlyLimit,
          extra_credits: 0,
        },
        status: 403,
      }
    }
    usedExtraCredit = true
  }

  const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const { error: unlockError } = await supabase.from('unlocked_companies').insert({
    user_id: userId,
    empresa_cnpj: normalizedCnpj,
    empresa_id: empresa.id,
    billing_cycle_start: now.toISOString(),
    billing_cycle_end: cycleEnd.toISOString(),
  })

  if (unlockError) {
    console.error('Unlock error:', unlockError)
    return { data: { error: 'Erro ao desbloquear empresa', details: unlockError.message }, status: 500 }
  }

  // Access log + credit deduction (fire-and-forget)
  supabase.from('access_logs').insert({
    user_id: userId,
    empresa_cnpj: normalizedCnpj,
    action: 'view',
    credits_used: usedExtraCredit ? 1 : 0,
    used_extra_credit: usedExtraCredit,
  }).then(() => {})

  if (usedExtraCredit) {
    supabase.from('profiles')
      .update({ extra_credits: extraCredits - 1 })
      .eq('user_id', userId)
      .then(() => {})
  }

  return {
    data: {
      message: 'Empresa desbloqueada com sucesso',
      unlocked: true,
      used_extra_credit: usedExtraCredit,
      credits_remaining: usedExtraCredit ? extraCredits - 1 : extraCredits,
      unlock_expires: cycleEnd.toISOString(),
      data: empresa,
    },
    status: 200,
  }
}

async function handleSocios(
  url: URL,
  supabase: ReturnType<typeof createClient>,
) {
  const cnpj = url.searchParams.get('cnpj')
  if (!cnpj) {
    return { data: { error: 'Parâmetro cnpj é obrigatório' }, status: 400 }
  }

  const cleaned = cleanCnpj(cnpj)
  const { data, error } = await supabase
    .from('socios')
    .select('*')
    .eq('empresa_cnpj', cleaned)

  if (error) {
    return { data: { error: 'Erro ao buscar sócios', details: error.message }, status: 500 }
  }
  return { data: { data: data ?? [] }, status: 200 }
}

async function handleCnaes(supabase: ReturnType<typeof createClient>) {
  // Use materialized view via RPC for performance
  try {
    const { data, error } = await supabase
      .from('empresas_filter_options')
      .select('valor')
      .eq('tipo', 'cnae')

    if (error) {
      console.error('CNAEs filter_options error:', error.message)
      // Fallback: direct query with limit
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('empresas')
        .select('cnae_codigo, cnae_fiscal')
        .not('cnae_codigo', 'is', null)
        .limit(500)

      if (fallbackError) {
        return { data: { error: 'Erro ao buscar CNAEs', details: fallbackError.message }, status: 500 }
      }

      const cnaesMap = new Map<string, string>()
      fallbackData?.forEach((e: { cnae_codigo: string; cnae_fiscal: string }) => {
        if (e.cnae_codigo && !cnaesMap.has(e.cnae_codigo)) {
          cnaesMap.set(e.cnae_codigo, e.cnae_fiscal || e.cnae_codigo)
        }
      })

      return {
        data: {
          data: Array.from(cnaesMap.entries()).map(([codigo, descricao]) => ({ codigo, descricao })),
          source: 'fallback',
        },
        status: 200,
      }
    }

    // Parse from materialized view (format: "codigo - descricao")
    const cnaes = (data ?? [])
      .map((row: { valor: string }) => {
        const parts = row.valor?.split(' - ')
        if (!parts || parts.length < 1) return null
        return {
          codigo: parts[0]?.trim(),
          descricao: parts.length > 1 ? parts.slice(1).join(' - ').trim() : parts[0]?.trim(),
        }
      })
      .filter(Boolean)

    return {
      data: { data: cnaes, total: cnaes.length },
      status: 200,
    }
  } catch (err) {
    console.error('CNAEs unexpected error:', err)
    return { data: { error: 'Erro inesperado ao buscar CNAEs' }, status: 500 }
  }
}

// ─── Permission map ─────────────────────────────────────────────────────────
const RESOURCE_PERMISSIONS: Record<string, string> = {
  empresas: 'read_empresas',
  unlock: 'read_empresas',
  socios: 'read_socios',
  cnaes: 'read_cnaes',
}

const VALID_RESOURCES = ['empresas', 'socios', 'cnaes', 'health', 'unlock', 'me'] as const
type Resource = (typeof VALID_RESOURCES)[number]

// ─── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // ── Extract & validate API key ──────────────────────────────────────
    const apiKey =
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace('Bearer ', '')

    if (!apiKey || !apiKey.startsWith('lb_')) {
      return errorResponse(
        'API key inválida ou ausente',
        401,
        'Envie sua API key no header "x-api-key" ou "Authorization: Bearer lb_..."',
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const keyHash = await hashKey(apiKey)
    const { data: keyData, error: keyError } = await supabase.rpc('validate_api_key', {
      p_key_hash: keyHash,
    })

    if (keyError || !keyData?.length) {
      return errorResponse('API key inválida ou expirada', 401)
    }

    const { user_id, api_key_id, permissions, rate_limit } = keyData[0]

    // ── Rate limiting ───────────────────────────────────────────────────
    if (!checkRateLimit(api_key_id, rate_limit)) {
      return errorResponse(
        'Rate limit excedido',
        429,
        `Limite de ${rate_limit} requisições/minuto atingido. Aguarde e tente novamente.`,
      )
    }

    // ── Route resolution ────────────────────────────────────────────────
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const resource = (pathParts.find((p) => VALID_RESOURCES.includes(p as Resource)) || 'health') as Resource

    // ── Permission check ────────────────────────────────────────────────
    const requiredPerm = RESOURCE_PERMISSIONS[resource]
    if (requiredPerm && !permissions.includes(requiredPerm)) {
      return errorResponse(
        `Permissão negada: ${requiredPerm}`,
        403,
        `Sua API key não possui a permissão "${requiredPerm}". Permissões atuais: [${permissions.join(', ')}]`,
      )
    }

    // ── Execute handler ─────────────────────────────────────────────────
    const startTime = Date.now()
    let result: { data: unknown; status: number }

    switch (resource) {
      case 'health':
        result = await handleHealth()
        break
      case 'me':
        result = await handleMe(supabase, user_id, api_key_id)
        break
      case 'empresas':
        result = await handleEmpresas(url, supabase, user_id)
        break
      case 'unlock':
        result = await handleUnlock(req, supabase, user_id)
        break
      case 'socios':
        result = await handleSocios(url, supabase)
        break
      case 'cnaes':
        result = await handleCnaes(supabase)
        break
      default:
        result = { data: { error: 'Recurso não encontrado' }, status: 404 }
    }

    // ── Log request (fire-and-forget) ───────────────────────────────────
    const responseTime = Date.now() - startTime
    supabase
      .from('api_request_logs')
      .insert({
        api_key_id,
        user_id,
        endpoint: `/${resource}`,
        method: req.method,
        status_code: result.status,
        response_time_ms: responseTime,
      })
      .then(() => {})

    return jsonResponse(result.data, result.status)
  } catch (error) {
    console.error('API Error:', error)
    return errorResponse(
      'Erro interno do servidor',
      500,
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
})
