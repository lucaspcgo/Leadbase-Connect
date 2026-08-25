import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SavedFilter {
  id: string;
  user_id: string;
  nome: string;
  filtros: {
    uf?: string;
    municipio?: string;
    cnae?: string;
    porte?: string;
    sit_cadastral?: string;
    simples?: string;
    mei?: string;
    matriz_filial?: string;
    has_email?: boolean;
    has_phone?: boolean;
    has_socios?: boolean;
  };
  notify_new_matches: boolean;
  last_notified_at?: string;
}

interface PushSubscription {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all saved filters with notifications enabled
    const { data: savedFilters, error: filtersError } = await supabase
      .from('saved_filters')
      .select('*')
      .eq('notify_new_matches', true);

    if (filtersError) throw filtersError;

    if (!savedFilters || savedFilters.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No filters with notifications enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for new companies added in the last hour (or since last check)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    let notificationsSent = 0;
    const processedUsers = new Set<string>();

    for (const filter of savedFilters as SavedFilter[]) {
      const { user_id, nome, filtros, id } = filter;
      
      // Skip if we already processed this user (avoid spam)
      if (processedUsers.has(user_id)) continue;

      // Build query to check for new matches
      let query = supabase
        .from('empresas')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo);

      // Apply filters
      if (filtros.uf) query = query.eq('uf', filtros.uf);
      if (filtros.municipio) query = query.eq('municipio', filtros.municipio);
      if (filtros.cnae) query = query.eq('cnae_codigo', filtros.cnae.split(' - ')[0]);
      if (filtros.porte) query = query.eq('porte_empresa', filtros.porte);
      if (filtros.sit_cadastral) query = query.eq('sit_cadastral', filtros.sit_cadastral);
      if (filtros.simples) query = query.eq('opcao_simples', filtros.simples);
      if (filtros.mei) query = query.eq('opcao_mei', filtros.mei);
      if (filtros.matriz_filial) query = query.eq('matriz_filial', filtros.matriz_filial);
      if (filtros.has_email) query = query.not('email', 'is', null);
      if (filtros.has_phone) query = query.not('ddd_telefone_1', 'is', null);

      const { count, error: countError } = await query;

      if (countError) {
        console.error(`Error checking matches for filter ${id}:`, countError);
        continue;
      }

      if (count && count > 0) {
        // Get user's push subscriptions
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', user_id);

        if (subError || !subscriptions || subscriptions.length === 0) continue;

        // Send notification
        const payload = JSON.stringify({
          title: `${count} nova${count > 1 ? 's' : ''} empresa${count > 1 ? 's' : ''} encontrada${count > 1 ? 's' : ''}!`,
          body: `O filtro "${nome}" tem novos resultados que correspondem aos seus critérios.`,
          url: '/buscar',
          data: { filterId: id },
          timestamp: Date.now(),
        });

        for (const sub of subscriptions as PushSubscription[]) {
          try {
            const response = await fetch(sub.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                'TTL': '86400',
              },
              body: payload,
            });

            if (response.ok) {
              notificationsSent++;
              processedUsers.add(user_id);
            } else if (response.status === 404 || response.status === 410) {
              // Subscription expired, remove it
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', (sub as any).id);
            }
          } catch (pushError) {
            console.error('Error sending push:', pushError);
          }
        }

        // Update last notified timestamp
        await supabase
          .from('saved_filters')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        filtersChecked: savedFilters.length,
        notificationsSent 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
