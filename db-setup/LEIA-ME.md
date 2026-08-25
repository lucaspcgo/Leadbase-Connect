# Reconstruindo o banco num Supabase novo

O projeto Supabase original (`ehpjcvsnyjuufmapkkrn`) foi deletado — o dominio
dele nao resolve mais no DNS. Estes arquivos recriam a **estrutura** do banco a
partir das 104 migracoes em `supabase/migrations/`.

> **Isto NAO restaura dados.** Nao existe backup de dados nos arquivos do
> projeto. As tabelas nascem vazias.

## 1. Criar o projeto

Em https://supabase.com, crie um projeto novo (o plano free serve). Escolha a
regiao `South America (Sao Paulo)` para menor latencia. **Guarde a senha do
banco** que voce definir — ela nao aparece de novo.

## 2. Rodar o schema

No painel do projeto novo, va em **SQL Editor** → **New query**.

Cole e execute **na ordem**, uma parte por vez, esperando cada uma terminar:

1. `schema-parte-1-de-2.sql`
2. `schema-parte-2-de-2.sql`

Se alguma parte der erro, pare e anote a mensagem — nao siga para a proxima.

## 3. Conferir

No **Table Editor** devem aparecer 41 tabelas, entre elas `empresas`, `socios`,
`profiles`, `plans`, `subscriptions`, `payments`, `coupons`, `affiliates`,
`unlocked_companies` e `categorias`.

## 4. Atualizar as chaves da aplicacao

Em **Project Settings** → **API**, copie a `Project URL` e a chave `anon`
`public`. Atualize `.env.production` na raiz do repositorio com os valores
novos, faca commit e redeploy no EasyPanel.

## 5. Edge functions

As 20 funcoes em `supabase/functions/` precisam ser publicadas com o Supabase
CLI:

```sh
npm i -g supabase
supabase login
supabase link --project-ref <REF_DO_PROJETO_NOVO>
supabase functions deploy
```

Os `verify_jwt = false` de cada funcao ja estao em `supabase/config.toml`.

### Segredos das functions

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` sao injetados
automaticamente pelo Supabase — nao precisa configurar.

Só as chaves VAPID (push notifications) precisam ser criadas manualmente, em
**Edge Functions** → **Secrets**. Um par novo, gerado para este projeto:

```
VAPID_PUBLIC_KEY=BDgtdB8WGFXWBfT2vATNqyTuAlK8L0B5XrzHPwEp-nD0ttsuj1MDDo7LWSi0Hz-PP5BTUOFK6sS83El4u_JnbQ8
VAPID_PRIVATE_KEY=-Ri_WrAjpztwBPwzSuO6J8pkmoxZUZAEUrPpJ4x0fD8
```

As credenciais de Stripe e Mercado Pago **nao** sao variaveis de ambiente: ficam
na tabela `payment_configs` e voce as recadastra pelo painel admin da aplicacao.

## 6. Recriar seu usuario admin

O primeiro cadastro pelo site cria um usuario comum. Cadastre-se normalmente
pelo site e depois rode no SQL Editor, trocando o e-mail:

```sql
insert into public.user_roles (user_id, role)
select id, 'master_admin' from auth.users where email = 'seu@email.com'
on conflict (user_id, role) do nothing;
```

Use `master_admin`, e nao `admin`: as credenciais de Stripe e Mercado Pago em
`payment_configs` so aparecem para o master admin, e voce vai precisar
recadastra-las.
