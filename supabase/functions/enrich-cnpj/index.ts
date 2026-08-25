import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EnrichRequest {
  cnpjs?: string[];
  mode: 'batch' | 'single' | 'queue' | 'continuous';
  limit?: number;
  onlyEmpty?: boolean;
  cronJob?: boolean;
  logId?: string;
  action?: 'pause' | 'resume' | 'stop';
  continuousLogId?: string; // Master log for continuous mode
}

interface BrasilApiResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  porte: string;
  natureza_juridica: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  cnaes_secundarios: { codigo: number; descricao: string }[];
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  uf: string;
  municipio: string;
  ddd_telefone_1: string;
  ddd_telefone_2: string;
  email: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string;
  data_inicio_atividade: string;
  capital_social: number;
  opcao_pelo_simples: boolean | null;
  opcao_pelo_mei: boolean | null;
  descricao_tipo_de_logradouro: string;
  qsa: { nome_socio: string; qualificacao_socio: string }[];
  data_opcao_pelo_simples: string | null;
  data_exclusao_do_simples: string | null;
  descricao_porte: string;
  descricao_situacao_cadastral: string;
  motivo_situacao_cadastral: number;
  descricao_motivo_situacao_cadastral: string;
}

async function fetchFromBrasilApi(cnpj: string): Promise<BrasilApiResponse | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchFromReceitaWs(cnpj: string): Promise<any | null> {
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'ERROR') return null;
    return data;
  } catch {
    return null;
  }
}

function mapBrasilApiToUpdate(data: BrasilApiResponse) {
  const update: Record<string, any> = {};
  
  if (data.razao_social) update.razao_social = data.razao_social;
  if (data.nome_fantasia) update.nome_fantasia = data.nome_fantasia;
  if (data.descricao_situacao_cadastral) update.sit_cadastral = data.descricao_situacao_cadastral.toUpperCase();
  if (data.descricao_porte) update.porte_empresa = data.descricao_porte;
  if (data.natureza_juridica) update.cod_natureza_juridica = data.natureza_juridica;
  if (data.cnae_fiscal) update.cnae_codigo = String(data.cnae_fiscal);
  if (data.cnae_fiscal_descricao) update.cnae_fiscal = `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}`;
  if (data.cnaes_secundarios?.length) {
    update.cnaes_secundarios = data.cnaes_secundarios.map(c => `${c.codigo} - ${c.descricao}`).join('; ');
  }
  if (data.descricao_tipo_de_logradouro) update.desc_tipo_logradouro = data.descricao_tipo_de_logradouro;
  if (data.logradouro) update.logradouro = data.logradouro;
  if (data.numero) update.numero = data.numero;
  if (data.complemento) update.complemento = data.complemento;
  if (data.bairro) update.bairro = data.bairro;
  if (data.cep) update.cep = data.cep.replace(/\D/g, '');
  if (data.uf) update.uf = data.uf;
  if (data.municipio) update.municipio = data.municipio;
  if (data.ddd_telefone_1) update.ddd_telefone_1 = data.ddd_telefone_1;
  if (data.ddd_telefone_2) update.ddd_telefone_2 = data.ddd_telefone_2;
  if (data.email) update.email = data.email.toLowerCase();
  if (data.capital_social != null) update.capital_social_empresa = data.capital_social;
  if (data.data_inicio_atividade) update.data_inicio_atividade = data.data_inicio_atividade;
  if (data.data_situacao_cadastral) update.data_sit_cadastral = data.data_situacao_cadastral;
  if (data.opcao_pelo_simples !== null) update.opcao_simples = data.opcao_pelo_simples ? 'SIM' : 'NAO';
  if (data.opcao_pelo_mei !== null) update.opcao_mei = data.opcao_pelo_mei ? 'SIM' : 'NAO';
  if (data.data_opcao_pelo_simples) update.data_opcao_simples = data.data_opcao_pelo_simples;
  if (data.data_exclusao_do_simples) update.data_exclusao_simples = data.data_exclusao_do_simples;
  if (data.descricao_motivo_situacao_cadastral) update.motivo_sit_cadastral = data.descricao_motivo_situacao_cadastral;
  
  if (data.qsa?.length) {
    update.socios = data.qsa.map(s => `${s.nome_socio} - ${s.qualificacao_socio}`).join('; ');
    update.socios_raw = JSON.stringify(data.qsa);
  }

  update.updated_at = new Date().toISOString();
  return update;
}

function mapReceitaWsToUpdate(data: any) {
  const update: Record<string, any> = {};
  
  if (data.nome) update.razao_social = data.nome;
  if (data.fantasia) update.nome_fantasia = data.fantasia;
  if (data.situacao) update.sit_cadastral = data.situacao.toUpperCase();
  if (data.porte) update.porte_empresa = data.porte;
  if (data.natureza_juridica) update.cod_natureza_juridica = data.natureza_juridica;
  if (data.atividade_principal?.[0]) {
    update.cnae_codigo = data.atividade_principal[0].code?.replace(/[.\-\/]/g, '');
    update.cnae_fiscal = `${update.cnae_codigo} - ${data.atividade_principal[0].text}`;
  }
  if (data.atividades_secundarias?.length) {
    update.cnaes_secundarios = data.atividades_secundarias
      .filter((a: any) => a.code !== '00.00-0-00')
      .map((a: any) => `${a.code?.replace(/[.\-\/]/g, '')} - ${a.text}`)
      .join('; ');
  }
  if (data.logradouro) update.logradouro = data.logradouro;
  if (data.numero) update.numero = data.numero;
  if (data.complemento) update.complemento = data.complemento;
  if (data.bairro) update.bairro = data.bairro;
  if (data.cep) update.cep = data.cep.replace(/\D/g, '');
  if (data.uf) update.uf = data.uf;
  if (data.municipio) update.municipio = data.municipio;
  if (data.telefone) update.ddd_telefone_1 = data.telefone;
  if (data.email) update.email = data.email.toLowerCase();
  if (data.capital_social) update.capital_social_empresa = parseFloat(data.capital_social);
  if (data.abertura) {
    const parts = data.abertura.split('/');
    if (parts.length === 3) update.data_inicio_atividade = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  if (data.data_situacao) {
    const parts = data.data_situacao.split('/');
    if (parts.length === 3) update.data_sit_cadastral = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  if (data.simples) {
    update.opcao_simples = data.simples.optante_simples === true ? 'SIM' : 'NAO';
    update.opcao_mei = data.simples.optante_mei === true ? 'SIM' : 'NAO';
  }
  if (data.motivo_situacao) update.motivo_sit_cadastral = data.motivo_situacao;
  if (data.qsa?.length) {
    update.socios = data.qsa.map((s: any) => `${s.nome} - ${s.qual}`).join('; ');
    update.socios_raw = JSON.stringify(data.qsa);
  }

  update.updated_at = new Date().toISOString();
  return update;
}

/**
 * Self-invoke to continue processing the next batch (fire-and-forget).
 * This makes the enrichment run entirely server-side, independent of the frontend.
 */
async function selfInvoke(body: EnrichRequest) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  try {
    // Fire-and-forget: we don't await the full response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for the invoke call itself
    
    await fetch(`${supabaseUrl}/functions/v1/enrich-cnpj`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).catch(() => {
      // Ignore errors from fire-and-forget
    });
    
    clearTimeout(timeoutId);
    console.log('Self-invoked next batch for continuous processing');
  } catch {
    console.log('Self-invoke fire-and-forget (expected abort)');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: EnrichRequest = await req.json();
    const { mode, cnpjs, limit = 50, onlyEmpty = true, cronJob = false, logId, action, continuousLogId } = body;

    // Handle control actions (pause/resume/stop)
    if (action && logId) {
      if (action === 'pause') {
        await supabase.from('enrichment_logs').update({ control: 'pause_requested' }).eq('id', logId);
        return new Response(JSON.stringify({ success: true, message: 'Pause requested' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'stop') {
        await supabase.from('enrichment_logs').update({ 
          control: 'stopped', 
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', logId);
        return new Response(JSON.stringify({ success: true, message: 'Stopped' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'resume') {
        await supabase.from('enrichment_logs').update({ control: 'running', status: 'running' }).eq('id', logId);
        // Don't return - fall through to continue processing
      }
    }

    let userId = 'system';
    let adminName = 'Cron Job';
    const isContinuous = mode === 'continuous' || !!continuousLogId;

    if (cronJob || isContinuous) {
      console.log(isContinuous ? 'Continuous enrichment batch started' : 'Cron job enrichment started');
    } else {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();
      adminName = profile?.name || user.email || 'Admin';
    }

    // For continuous mode, check if the master log was stopped/paused
    const masterLogId = continuousLogId || logId;
    if (isContinuous && masterLogId) {
      const { data: masterLog } = await supabase
        .from('enrichment_logs')
        .select('control')
        .eq('id', masterLogId)
        .single();
      
      if (masterLog?.control === 'stopped' || masterLog?.control === 'pause_requested' || masterLog?.control === 'paused') {
        console.log(`Continuous mode stopped/paused. Control: ${masterLog.control}`);
        if (masterLog.control === 'pause_requested') {
          await supabase.from('enrichment_logs').update({ control: 'paused', status: 'paused' }).eq('id', masterLogId);
        }
        return new Response(JSON.stringify({ success: true, stopped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let targetCnpjs: string[] = [];
    const effectiveMode = mode === 'continuous' ? 'batch' : mode;

    if (effectiveMode === 'single' && cnpjs?.length) {
      targetCnpjs = cnpjs;
    } else if (effectiveMode === 'queue') {
      const { data: empresas, error: fetchErr } = await supabase
        .from('empresas')
        .select('cnpj')
        .eq('needs_enrichment', true)
        .limit(Math.min(limit, 1000));
      if (fetchErr) throw fetchErr;
      targetCnpjs = (empresas || []).map((e: any) => e.cnpj);
    } else {
      // Batch mode: find empresas with missing critical data
      let query = supabase
        .from('empresas')
        .select('cnpj')
        .limit(Math.min(limit, 1000));

      if (onlyEmpty) {
        query = query.or(
          'porte_empresa.is.null,opcao_simples.is.null,email.is.null,ddd_telefone_1.is.null,capital_social_empresa.is.null'
        );
      }

      const { data: empresas, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      targetCnpjs = (empresas || []).map((e: any) => e.cnpj);
    }

    if (targetCnpjs.length === 0) {
      // No more items - finalize the master log if in continuous mode
      if (isContinuous && masterLogId) {
        await supabase.from('enrichment_logs').update({
          status: 'completed',
          control: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', masterLogId);
      }
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhuma empresa para enriquecer',
        enriched: 0, failed: 0, skipped: 0, total: 0,
        continuous_finished: isContinuous,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create or reuse log entry
    let logEntryId = masterLogId;
    if (!logEntryId) {
      const { data: logEntry } = await supabase
        .from('enrichment_logs')
        .insert({
          admin_id: userId === 'system' ? '00000000-0000-0000-0000-000000000000' : userId,
          admin_name: adminName,
          total_cnpjs: targetCnpjs.length,
          status: 'running',
          control: 'running',
          source: 'brasilapi+receitaws',
        })
        .select('id')
        .single();
      logEntryId = logEntry?.id;
    } else {
      // Update total count for continuous mode (accumulate)
      if (isContinuous) {
        const { data: currentLog } = await supabase
          .from('enrichment_logs')
          .select('total_cnpjs')
          .eq('id', logEntryId)
          .single();
        
        if (currentLog) {
          await supabase.from('enrichment_logs').update({
            total_cnpjs: currentLog.total_cnpjs + targetCnpjs.length,
            status: 'running',
            control: 'running',
          }).eq('id', logEntryId);
        }
      }
    }

    let enriched = 0;
    let failed = 0;
    let skipped = 0;
    const startTime = Date.now();
    const MAX_EXECUTION_MS = 120_000; // 120s safety limit (edge fn timeout is ~150s)
    let timedOut = false;

    for (const cnpj of targetCnpjs) {
      try {
        // Check wall-clock time to avoid 504 timeout
        if (Date.now() - startTime > MAX_EXECUTION_MS) {
          console.log(`Approaching timeout after ${enriched + failed + skipped} items. Will self-invoke to continue.`);
          timedOut = true;
          break;
        }

        // Check for pause/stop request every iteration
        if (logEntryId) {
          const { data: logCheck } = await supabase
            .from('enrichment_logs')
            .select('control')
            .eq('id', logEntryId)
            .single();
          
          if (logCheck?.control === 'stopped') {
            await supabase.from('enrichment_logs').update({
              status: 'completed',
              control: 'stopped',
              enriched, failed, skipped,
              completed_at: new Date().toISOString(),
            }).eq('id', logEntryId);
            
            return new Response(JSON.stringify({
              success: true, stopped: true,
              total: targetCnpjs.length,
              enriched, failed, skipped,
              log_id: logEntryId,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (logCheck?.control === 'pause_requested') {
            await supabase.from('enrichment_logs').update({
              control: 'paused',
              status: 'paused',
              enriched, failed, skipped,
            }).eq('id', logEntryId);
            
            return new Response(JSON.stringify({
              success: true,
              paused: true,
              total: targetCnpjs.length,
              enriched, failed, skipped,
              log_id: logEntryId,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Rate limiting
        if (enriched + failed + skipped > 0) {
          await new Promise(r => setTimeout(r, 300));
        }

        // Get current data
        const { data: current } = await supabase
          .from('empresas')
          .select('*')
          .eq('cnpj', cnpj)
          .single();

        if (!current) {
          skipped++;
          if (logEntryId) {
            await supabase.from('enrichment_results').insert({
              log_id: logEntryId, cnpj, status: 'not_found',
              razao_social: null,
            });
          }
          continue;
        }

        // Try BrasilAPI first
        let updateData: Record<string, any> | null = null;
        let source = 'brasilapi';

        const brasilData = await fetchFromBrasilApi(cnpj);
        if (brasilData) {
          updateData = mapBrasilApiToUpdate(brasilData);
        } else {
          await new Promise(r => setTimeout(r, 700));
          const receitaData = await fetchFromReceitaWs(cnpj);
          if (receitaData) {
            updateData = mapReceitaWsToUpdate(receitaData);
            source = 'receitaws';
          }
        }

        if (!updateData || Object.keys(updateData).length <= 1) {
          failed++;
          if (logEntryId) {
            await supabase.from('enrichment_results').insert({
              log_id: logEntryId, cnpj, status: 'api_error',
              razao_social: (current as any).razao_social,
            });
          }
          continue;
        }

        // Filter for onlyEmpty mode with always-update exceptions
        if (onlyEmpty) {
          const alwaysUpdateFields = ['sit_cadastral', 'motivo_sit_cadastral', 'data_sit_cadastral', 'opcao_simples', 'opcao_mei', 'data_opcao_simples', 'data_exclusao_simples'];
          const filteredUpdate: Record<string, any> = { updated_at: updateData.updated_at };
          for (const [key, value] of Object.entries(updateData)) {
            if (key === 'updated_at') continue;
            const currentVal = (current as any)[key];
            if (alwaysUpdateFields.includes(key)) {
              filteredUpdate[key] = value;
            } else if (currentVal === null || currentVal === undefined || currentVal === '') {
              filteredUpdate[key] = value;
            }
          }
          updateData = filteredUpdate;
        }

        const changedFields = Object.keys(updateData).filter(k => k !== 'updated_at' && k !== 'needs_enrichment');
        const fieldsToUpdate = changedFields.length;
        
        if (fieldsToUpdate === 0) {
          skipped++;
          if (logEntryId) {
            await supabase.from('enrichment_results').insert({
              log_id: logEntryId, cnpj, status: 'already_complete',
              razao_social: (current as any).razao_social, source,
              fields_changed: [],
            });
          }
          await supabase.from('empresas').update({ needs_enrichment: false }).eq('cnpj', cnpj);
          continue;
        }

        // Also clear the needs_enrichment flag
        updateData.needs_enrichment = false;

        const { error: updateErr } = await supabase
          .from('empresas')
          .update(updateData)
          .eq('cnpj', cnpj);

        if (updateErr) {
          failed++;
          if (logEntryId) {
            await supabase.from('enrichment_results').insert({
              log_id: logEntryId, cnpj, status: 'update_error',
              razao_social: (current as any).razao_social,
              error_message: updateErr.message,
              fields_changed: changedFields,
            });
          }
          console.error(`Error updating ${cnpj}:`, updateErr);
        } else {
          enriched++;
          if (logEntryId) {
            await supabase.from('enrichment_results').insert({
              log_id: logEntryId, cnpj, status: 'enriched',
              razao_social: (current as any).razao_social,
              source, fields_updated: fieldsToUpdate,
              fields_changed: changedFields,
            });
          }
        }

        // Update log periodically
        if ((enriched + failed + skipped) % 5 === 0 && logEntryId) {
          await supabase.from('enrichment_logs').update({ enriched, failed, skipped }).eq('id', logEntryId);
        }
      } catch (err) {
        failed++;
        if (logEntryId) {
          await supabase.from('enrichment_results').insert({
            log_id: logEntryId, cnpj, status: 'error',
            error_message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
        console.error(`Error processing ${cnpj}:`, err);
      }
    }

    // Update log with current progress
    if (logEntryId) {
      await supabase.from('enrichment_logs').update({ enriched, failed, skipped }).eq('id', logEntryId);
    }

    // Decide whether to self-invoke for continuation
    const shouldContinue = isContinuous && (timedOut || targetCnpjs.length >= limit);
    
    if (shouldContinue && logEntryId) {
      // Self-invoke to continue processing - fire and forget
      console.log('Self-invoking for next continuous batch...');
      selfInvoke({
        mode: 'continuous',
        limit,
        onlyEmpty,
        cronJob: true, // Use service role auth
        continuousLogId: logEntryId,
      });
    } else if (logEntryId && !shouldContinue) {
      // Finalize log - processing is truly done
      await supabase.from('enrichment_logs').update({
        status: 'completed',
        control: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', logEntryId);
    }

    return new Response(JSON.stringify({
      success: true,
      total: targetCnpjs.length,
      enriched, failed, skipped,
      timed_out: timedOut,
      processed: enriched + failed + skipped,
      log_id: logEntryId,
      continuous: isContinuous,
      continuing: shouldContinue,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Enrich error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
