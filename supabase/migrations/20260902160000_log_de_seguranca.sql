-- Trilha de auditoria para acoes administrativas sensiveis.
--
-- O unico log de admin que existia era financial_audit_logs, restrito por CHECK
-- a acoes de cobranca (PAYMENT_MARKED_PAID, SUBSCRIPTION_EXTENDED...). Redefinir
-- a senha de um cliente nao e um evento financeiro e nao cabia la sem sujar
-- aquela trilha, entao ganha uma propria.

create table if not exists public.admin_security_logs (
    id                uuid primary key default gen_random_uuid(),
    admin_id          uuid not null references auth.users(id) on delete cascade,
    target_user_id    uuid references auth.users(id) on delete set null,
    action            text not null check (action in ('PASSWORD_RESET')),
    details           text,
    created_at        timestamptz not null default now()
);

create index if not exists idx_admin_security_logs_created
    on public.admin_security_logs (created_at desc);
create index if not exists idx_admin_security_logs_target
    on public.admin_security_logs (target_user_id, created_at desc);

alter table public.admin_security_logs enable row level security;

-- Somente admins leem. Nao ha policy de INSERT/UPDATE/DELETE de proposito: as
-- linhas entram pela service_role (a edge function), que passa por cima de RLS,
-- e ninguem logado consegue apagar ou reescrever o proprio rastro.
drop policy if exists "admins leem log de seguranca" on public.admin_security_logs;
create policy "admins leem log de seguranca"
    on public.admin_security_logs
    for select
    to authenticated
    using (public.is_admin(auth.uid()));
