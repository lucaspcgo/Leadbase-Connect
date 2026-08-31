-- Validade de plano.
--
-- Ate aqui o plano do cliente nunca expirava: profiles.plan_id ficava valendo
-- para sempre e o admin tinha que rebaixar na mao. A tela "Prorrogar" em
-- Pagamentos so mexia em subscriptions.current_period_end, campo que nenhuma
-- parte do app le.
--
-- NULL em plan_expires_at = sem validade (o caso do plano free e de contas
-- vitalicias). Data no passado = o cliente volta para o free.

alter table public.profiles
  add column if not exists plan_expires_at timestamptz;

comment on column public.profiles.plan_expires_at is
  'Quando o plano pago vence. NULL = nunca expira. Vencido = cai para free.';

create index if not exists idx_profiles_plan_expires_at
  on public.profiles (plan_expires_at)
  where plan_expires_at is not null;

-- Rebaixa quem venceu. Chamada de hora em hora pelo cron da VPS e tambem
-- pelo app no login, para o efeito ser imediato.
create or replace function public.expirar_planos_vencidos()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_qtd integer;
begin
  with vencidos as (
    update public.profiles
       set plan_id         = 'free',
           plan_expires_at = null,
           updated_at      = now()
     where plan_expires_at is not null
       and plan_expires_at < now()
       and plan_id <> 'free'
    returning user_id, plan_id
  )
  select count(*) into v_qtd from vencidos;

  return v_qtd;
end;
$fn$;

-- Estende o plano de um cliente. Se ele ja tem validade futura, soma em cima
-- dela (nao perde os dias que faltavam); se nao tem ou ja venceu, conta a
-- partir de agora.
create or replace function public.prorrogar_plano(
  p_user_id uuid,
  p_dias     integer,
  p_plan_id  text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_base    timestamptz;
  v_novo    timestamptz;
  v_antes   timestamptz;
  v_plano   text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado: apenas administradores podem prorrogar planos';
  end if;

  if p_dias is null or p_dias = 0 then
    raise exception 'Informe quantos dias prorrogar';
  end if;

  select plan_expires_at, plan_id into v_antes, v_plano
    from public.profiles where user_id = p_user_id;

  if not found then
    raise exception 'Usuario nao encontrado';
  end if;

  v_base := greatest(coalesce(v_antes, now()), now());
  v_novo := v_base + make_interval(days => p_dias);

  update public.profiles
     set plan_id         = coalesce(p_plan_id, plan_id),
         plan_expires_at = v_novo,
         updated_at      = now()
   where user_id = p_user_id;

  insert into public.financial_audit_logs
    (admin_id, admin_name, action, target_user_id, entity_type, details,
     before_value, after_value)
  select auth.uid(),
         coalesce((select name from public.profiles where user_id = auth.uid()), 'admin'),
         'SUBSCRIPTION_EXTENDED', p_user_id, 'SUBSCRIPTION',
         format('Plano %s prorrogado em %s dias', coalesce(p_plan_id, v_plano), p_dias),
         coalesce(v_antes::text, 'sem validade'),
         v_novo::text;

  return v_novo;
end;
$fn$;

grant execute on function public.prorrogar_plano(uuid, integer, text) to authenticated;
grant execute on function public.expirar_planos_vencidos() to authenticated;
