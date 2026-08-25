import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64URL encoding/decoding utilities
function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Create VAPID JWT for authentication
async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // JWT Header
  const header = { typ: 'JWT', alg: 'ES256' };
  
  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key for signing
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  
  // Create JWK from raw private key
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: base64UrlEncode(privateKeyBytes),
    x: '', // Will be derived
    y: '', // Will be derived
  };

  // For proper VAPID, we need both private and public key components
  // The public key gives us x and y coordinates
  const publicKeyBytes = base64UrlDecode(vapidPublicKey);
  
  // Public key format: 0x04 || x (32 bytes) || y (32 bytes)
  if (publicKeyBytes.length === 65 && publicKeyBytes[0] === 0x04) {
    jwk.x = base64UrlEncode(publicKeyBytes.slice(1, 33));
    jwk.y = base64UrlEncode(publicKeyBytes.slice(33, 65));
  } else {
    throw new Error('Invalid public key format');
  }

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(unsignedToken)
  );

  // Convert signature from WebCrypto format (r || s, each 32 bytes) to base64url
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: `p256ecdsa=${vapidPublicKey}`,
  };
}

// Encrypt payload using ECDH + AES-GCM (RFC 8291)
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ body: ArrayBuffer; salt: Uint8Array; publicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  
  // Generate ephemeral key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import client's public key (p256dh)
  const clientPublicKeyBytes = base64UrlDecode(p256dh);
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret via ECDH
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Get auth secret
  const authSecret = base64UrlDecode(auth);

  // Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive key material
  // Step 1: Create auth_info and derive ikm
  const authInfo = encoder.encode('WebPush: info\0');
  const authInfoFull = new Uint8Array(authInfo.length + clientPublicKeyBytes.length + localPublicKey.length);
  authInfoFull.set(authInfo);
  authInfoFull.set(clientPublicKeyBytes, authInfo.length);
  authInfoFull.set(localPublicKey, authInfo.length + clientPublicKeyBytes.length);

  // Import shared secret for HKDF
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret.buffer as ArrayBuffer,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Derive PRK using auth secret as salt
  const prkBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: authSecret.buffer as ArrayBuffer,
      info: authInfoFull.buffer as ArrayBuffer,
    },
    sharedSecretKey,
    256
  );
  const prk = new Uint8Array(prkBits);

  // Import PRK for deriving content encryption key
  const prkKey = await crypto.subtle.importKey(
    'raw',
    prk.buffer as ArrayBuffer,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Derive CEK (Content Encryption Key) - 16 bytes for AES-128-GCM
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const cekBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      info: cekInfo.buffer as ArrayBuffer,
    },
    prkKey,
    128
  );
  const cek = new Uint8Array(cekBits);

  // Derive nonce - 12 bytes
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      info: nonceInfo.buffer as ArrayBuffer,
    },
    prkKey,
    96
  );
  const nonce = new Uint8Array(nonceBits);

  // Prepare plaintext with padding
  // Format: payload || 0x02 (delimiter for final record)
  const payloadBytes = encoder.encode(payload);
  const plaintext = new Uint8Array(payloadBytes.length + 1);
  plaintext.set(payloadBytes);
  plaintext[payloadBytes.length] = 0x02; // Final record delimiter

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Encrypt with AES-128-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    plaintext
  );

  // Build aes128gcm header: salt (16) || rs (4) || idlen (1) || keyid (65)
  const rs = 4096; // Record size
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs);
  
  const header = new Uint8Array(16 + 4 + 1 + localPublicKey.length);
  header.set(salt, 0);
  header.set(rsBytes, 16);
  header[20] = localPublicKey.length;
  header.set(localPublicKey, 21);

  // Combine header + ciphertext
  const body = new Uint8Array(header.length + ciphertext.byteLength);
  body.set(header);
  body.set(new Uint8Array(ciphertext), header.length);

  return { body: body.buffer as ArrayBuffer, salt, publicKey: localPublicKey };
}

// Send a single push notification
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    // Create VAPID auth headers
    const vapidHeaders = await createVapidAuthHeader(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      'mailto:contato@leadsbase.com.br'
    );

    // Encrypt the payload
    const encrypted = await encryptPayload(payload, subscription.p256dh, subscription.auth);

    // Send the push notification
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': vapidHeaders.authorization,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: encrypted.body,
    });

    if (response.ok || response.status === 201) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text();
    console.error(`Push failed: ${response.status} - ${errorText}`);

    return { success: false, statusCode: response.status, error: errorText };
  } catch (error) {
    console.error('Push error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    // Verify the user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || !['admin', 'master_admin'].includes(userRole.role)) {
      throw new Error('Admin access required');
    }

    const { title, body, url } = await req.json();

    if (!title || !body) {
      throw new Error('Missing required fields: title, body');
    }

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*');

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      url: url || '/',
      data: { broadcast: true },
      timestamp: Date.now(),
    });

    let successCount = 0;
    let failedCount = 0;
    const failedIds: string[] = [];

    // Send to each subscription
    for (const sub of subscriptions) {
      console.log(`Sending to subscription ${sub.id}...`);
      
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notificationPayload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.success) {
        successCount++;
        console.log(`Successfully sent to ${sub.id}`);
      } else {
        failedCount++;
        console.error(`Failed to send to ${sub.id}: ${result.error}`);
        
        // 410 Gone or 404 means subscription is invalid
        if (result.statusCode === 410 || result.statusCode === 404) {
          failedIds.push(sub.id);
        }
      }
    }

    // Clean up invalid subscriptions
    if (failedIds.length > 0) {
      console.log(`Cleaning up ${failedIds.length} invalid subscriptions`);
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('id', failedIds);
    }

    console.log(`Broadcast complete: ${successCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage === 'Unauthorized' || errorMessage === 'Admin access required' ? 403 : 500;
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
