import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { affiliate_id, referred_user_id, referred_user_email } = await req.json();

    if (!affiliate_id || !referred_user_id || !referred_user_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-referral] Processing referral for affiliate ${affiliate_id}`);

    // Check if referral already exists for this user
    const { data: existingReferral } = await supabaseClient
      .from('referrals')
      .select('id')
      .eq('referred_user_id', referred_user_id)
      .maybeSingle();

    if (existingReferral) {
      console.log(`[process-referral] User ${referred_user_id} already has a referral`);
      return new Response(
        JSON.stringify({ success: false, message: "User already referred" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create referral record
    const { data: referral, error: referralError } = await supabaseClient
      .from('referrals')
      .insert({
        affiliate_id,
        referred_user_id,
        referred_user_email,
        status: 'PENDING',
      })
      .select()
      .single();

    if (referralError) {
      console.error(`[process-referral] Error creating referral:`, referralError);
      throw referralError;
    }

    // Update affiliate's total referrals count
    const { data: affiliate } = await supabaseClient
      .from('affiliates')
      .select('total_referrals')
      .eq('id', affiliate_id)
      .single();

    if (affiliate) {
      await supabaseClient
        .from('affiliates')
        .update({ total_referrals: (affiliate.total_referrals || 0) + 1 })
        .eq('id', affiliate_id);
    }

    console.log(`[process-referral] Referral created successfully: ${referral.id}`);

    return new Response(
      JSON.stringify({ success: true, referral_id: referral.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[process-referral] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
