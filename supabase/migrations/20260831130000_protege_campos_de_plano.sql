-- Fecha a escalada de privilegio em profiles.
--
-- A policy "Users can update own profile" e apenas por linha:
--   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
-- Ela nao limita QUAIS colunas o usuario pode escrever. Qualquer cliente
-- logado conseguia, com o proprio token:
--
--   PATCH /rest/v1/profiles?user_id=eq.<seu_id>
--   {"plan_id":"equipe","extra_credits":99999}
--
-- e se dar o plano mais caro de graca. Verificado em producao (HTTP 200).
--
-- RLS nao tem WITH CHECK por coluna nem enxerga OLD, entao a barreira vai
-- num trigger, que compara linha antiga com nova.
--
-- Quem continua podendo alterar estes campos:
--   - admins (is_admin)
--   - service_role, usado pelos webhooks de pagamento para liberar o plano
--     depois da cobranca (nesse caso auth.uid() e nulo)

create or replace function public.proteger_campos_sensiveis_do_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- service_role e rotinas internas: sem usuario autenticado no contexto.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.plan_id                is distinct from old.plan_id
     or new.plan_expires_at        is distinct from old.plan_expires_at
     or new.plan_start_date        is distinct from old.plan_start_date
     or new.extra_credits          is distinct from old.extra_credits
     or new.monthly_limit_override is distinct from old.monthly_limit_override
     or new.status                 is distinct from old.status
     or new.user_id                is distinct from old.user_id then
    raise exception
      'Acesso negado: plano, creditos, limite e status so podem ser alterados por administradores';
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_proteger_campos_sensiveis_do_perfil on public.profiles;
create trigger trg_proteger_campos_sensiveis_do_perfil
  before update on public.profiles
  for each row
  execute function public.proteger_campos_sensiveis_do_perfil();

-- Define a validade diretamente (o painel usa para remover a validade).
-- Mesma protecao de prorrogar_plano: nao depende da RLS da tabela.
create or replace function public.definir_validade_plano(
  p_user_id    uuid,
  p_expires_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_antes timestamptz;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado: apenas administradores podem definir a validade do plano';
  end if;

  select plan_expires_at into v_antes
    from public.profiles where user_id = p_user_id;

  if not found then
    raise exception 'Usuario nao encontrado';
  end if;

  update public.profiles
     set plan_expires_at = p_expires_at,
         updated_at      = now()
   where user_id = p_user_id;

  insert into public.financial_audit_logs
    (admin_id, admin_name, action, target_user_id, entity_type, details,
     before_value, after_value)
  select auth.uid(),
         coalesce((select name from public.profiles where user_id = auth.uid()), 'admin'),
         'SUBSCRIPTION_EXTENDED', p_user_id, 'SUBSCRIPTION',
         case when p_expires_at is null
              then 'Validade do plano removida (nao expira)'
              else 'Validade do plano definida manualmente' end,
         coalesce(v_antes::text, 'sem validade'),
         coalesce(p_expires_at::text, 'sem validade');

  return p_expires_at;
end;
$fn$;

grant execute on function public.definir_validade_plano(uuid, timestamptz) to authenticated;
