import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * This function is called when a payment is approved to calculate and create affiliate commission
 */
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

    const { payment_id, user_id, amount, subscription_id } = await req.json();

    if (!payment_id || !user_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-affiliate-commission] Processing commission for payment ${payment_id}`);

    // Check if this user was referred
    const { data: referral, error: referralError } = await supabaseClient
      .from('referrals')
      .select(`
        id,
        affiliate_id,
        status,
        affiliates (
          id,
          commission_rate,
          status,
          total_earnings,
          pending_earnings
        )
      `)
      .eq('referred_user_id', user_id)
      .maybeSingle();

    if (referralError) {
      console.error(`[process-affiliate-commission] Error fetching referral:`, referralError);
      throw referralError;
    }

    if (!referral) {
      console.log(`[process-affiliate-commission] No referral found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: false, message: "No referral found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const affiliate = referral.affiliates as any;
    
    if (!affiliate || affiliate.status !== 'ACTIVE') {
      console.log(`[process-affiliate-commission] Affiliate not active`);
      return new Response(
        JSON.stringify({ success: false, message: "Affiliate not active" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if commission already exists for this payment
    const { data: existingCommission } = await supabaseClient
      .from('affiliate_commissions')
      .select('id')
      .eq('payment_id', payment_id)
      .maybeSingle();

    if (existingCommission) {
      console.log(`[process-affiliate-commission] Commission already exists for payment ${payment_id}`);
      return new Response(
        JSON.stringify({ success: false, message: "Commission already exists" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate commission
    const commissionRate = affiliate.commission_rate;
    const commissionAmount = (amount * commissionRate) / 100;

    console.log(`[process-affiliate-commission] Creating commission: ${commissionAmount} (${commissionRate}% of ${amount})`);

    // Create commission record
    const { data: commission, error: commissionError } = await supabaseClient
      .from('affiliate_commissions')
      .insert({
        affiliate_id: affiliate.id,
        referral_id: referral.id,
        payment_id,
        subscription_id,
        amount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'PENDING',
      })
      .select()
      .single();

    if (commissionError) {
      console.error(`[process-affiliate-commission] Error creating commission:`, commissionError);
      throw commissionError;
    }

    // Update referral status to CONVERTED if first payment
    if (referral.status === 'PENDING') {
      await supabaseClient
        .from('referrals')
        .update({
          status: 'CONVERTED',
          converted_at: new Date().toISOString(),
        })
        .eq('id', referral.id);
    }

    // Update affiliate earnings
    await supabaseClient
      .from('affiliates')
      .update({
        total_earnings: (affiliate.total_earnings || 0) + commissionAmount,
        pending_earnings: (affiliate.pending_earnings || 0) + commissionAmount,
      })
      .eq('id', affiliate.id);

    console.log(`[process-affiliate-commission] Commission created successfully: ${commission.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        commission_id: commission.id,
        commission_amount: commissionAmount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[process-affiliate-commission] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
