// Deploy with: supabase functions deploy submit-profile
//
// Called by the app after onboarding (email/name/birth date) completes,
// and again after every gate re-verification to keep verified_epoch
// current. There is no Kayvee login - device_id (a random id generated
// once on-device) is the only key.
//
// The app_users table has NO anon-role policies at all (see schema.sql),
// so this function - running with the service role key - is the only
// way any row in it is ever read or written.

import { getSupabaseAdmin, jsonResponse } from '../_shared/supabaseAdmin.ts';
import { sendTelegramMessage } from '../_shared/telegram.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const deviceId = String(body.device_id ?? '').trim();
  const firstName = String(body.first_name ?? '').trim();
  const lastName = String(body.last_name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const birthDate = String(body.birth_date ?? '').trim();
  const middleName = body.middle_name ? String(body.middle_name).trim() : null;
  const isAdmin = Boolean(body.is_admin);
  const verifiedEpoch = Number.isFinite(Number(body.verified_epoch)) ? Number(body.verified_epoch) : 0;

  if (!deviceId || !firstName || !lastName || !email || !birthDate) {
    return jsonResponse({ error: 'Missing required profile fields.' }, 400);
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: selectError } = await supabase
    .from('app_users')
    .select('id')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (selectError) return jsonResponse({ error: selectError.message }, 500);

  const row = {
    device_id: deviceId,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    email,
    birth_date: birthDate,
    is_admin: isAdmin,
    verified_epoch: verifiedEpoch,
  };

  if (existing) {
    const { error: updateError } = await supabase.from('app_users').update(row).eq('device_id', deviceId);
    if (updateError) return jsonResponse({ error: updateError.message }, 500);
    return jsonResponse({ ok: true, created: false });
  }

  const { error: insertError } = await supabase.from('app_users').insert(row);
  if (insertError) return jsonResponse({ error: insertError.message }, 500);

  const { count } = await supabase
    .from('app_users')
    .select('id', { count: 'exact', head: true })
    .eq('is_admin', false);

  await sendTelegramMessage(
    `New KayVee user: ${firstName} ${lastName}\nEmail: ${email}\nTotal users (excluding admins): ${count ?? 'unknown'}`
  );

  return jsonResponse({ ok: true, created: true });
});
