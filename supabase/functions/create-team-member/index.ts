import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTeamMemberRequest {
  email: string;
  password: string;
  name: string;
  ownerUserId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller's session
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, name, ownerUserId }: CreateTeamMemberRequest = await req.json();

    // Validate that the caller is the owner
    if (caller.id !== ownerUserId) {
      return new Response(
        JSON.stringify({ error: "Você só pode adicionar membros à sua própria equipe" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate inputs
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "Email, nome e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user with this email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let memberUserId: string;

    // Get owner's profile to inherit plan settings
    const { data: ownerProfile, error: ownerError } = await supabaseAdmin
      .from("profiles")
      .select("plan_id, plan_start_date")
      .eq("user_id", ownerUserId)
      .single();

    if (ownerError || !ownerProfile) {
      console.error("Error fetching owner profile:", ownerError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar perfil do proprietário" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingUser) {
      // User already exists, just use their ID
      memberUserId = existingUser.id;
      
      // Update existing user's profile to inherit owner's plan
      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update({
          plan_id: ownerProfile.plan_id,
          plan_start_date: ownerProfile.plan_start_date,
        })
        .eq("user_id", memberUserId);

      if (updateProfileError) {
        console.error("Error updating member profile:", updateProfileError);
      }
    } else {
      // Create new user with admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: name.trim(),
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      memberUserId = newUser.user.id;

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update new user's profile to inherit owner's plan
      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update({
          plan_id: ownerProfile.plan_id,
          plan_start_date: ownerProfile.plan_start_date,
        })
        .eq("user_id", memberUserId);

      if (updateProfileError) {
        console.error("Error updating new member profile:", updateProfileError);
      }
    }

    // Check if this member is already in the team
    const { data: existingMember } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .eq("member_email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: "Este email já está na sua equipe" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create team member record
    const { data: teamMember, error: insertError } = await supabaseAdmin
      .from("team_members")
      .insert({
        owner_user_id: ownerUserId,
        member_user_id: memberUserId,
        member_email: email.toLowerCase().trim(),
        member_name: name.trim(),
        status: "ACTIVE",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating team member:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        teamMember,
        inheritedPlan: ownerProfile.plan_id,
        message: existingUser 
          ? "Membro existente adicionado à equipe com plano herdado" 
          : "Novo usuário criado e adicionado à equipe com plano herdado"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-team-member:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
