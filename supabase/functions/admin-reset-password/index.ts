import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Troca a senha de um usuario a pedido de um admin.
 *
 * Antes isto nao existia: o botao "Salvar Nova Senha" do painel chamava
 * updateUser({}) e mostrava "Senha alterada com sucesso" sem tocar em
 * auth.users -- o admin achava que tinha trocado, e o cliente continuava
 * sem conseguir entrar.
 *
 * A senha so pode ser definida pela service_role, que nunca pode ir para o
 * navegador; por isso a troca mora aqui e nao no frontend.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "No authorization header" }, 401);
    }

    // Quem esta pedindo? Validado pelo token dele, nao por nada que o corpo diga.
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: requester }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requester) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: requester.id });
    if (!isAdmin) {
      return json({ error: "Apenas administradores podem alterar senhas" }, 403);
    }

    const { userId, newPassword } = await req.json();
    if (!userId || typeof newPassword !== "string") {
      return json({ error: "userId e newPassword sao obrigatorios" }, 400);
    }
    if (newPassword.length < 6) {
      return json({ error: "A senha deve ter no minimo 6 caracteres" }, 400);
    }

    // Um master_admin so pode ter a senha trocada por ele mesmo. Sem isto, um
    // admin comum poderia assumir a conta do dono do sistema trocando a senha
    // dele -- escalada de privilegio pela porta dos fundos.
    const { data: targetRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (targetRole?.role === "master_admin" && userId !== requester.id) {
      return json({ error: "A senha de um Master Admin so pode ser alterada por ele mesmo" }, 403);
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError);
      return json({ error: "Falha ao atualizar a senha: " + updateError.message }, 500);
    }

    // Trilha de auditoria: trocar a senha de alguem e uma acao sensivel e
    // precisa aparecer nos logs do admin como qualquer outra.
    const { error: logError } = await supabaseAdmin.from("admin_security_logs").insert({
      admin_id: requester.id,
      target_user_id: userId,
      action: "PASSWORD_RESET",
      details: "Senha redefinida pelo administrador",
    });
    // A senha ja foi trocada; falhar o log nao pode desfazer isso nem fazer o
    // admin achar que a troca nao valeu. Registra no console e segue.
    if (logError) {
      console.error("Senha alterada, mas o log de auditoria falhou:", logError);
    }

    return json({ success: true, message: "Senha alterada com sucesso" }, 200);
  } catch (error: unknown) {
    console.error("Erro em admin-reset-password:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return json({ error: errorMessage }, 500);
  }
});
