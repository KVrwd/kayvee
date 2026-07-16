// Deploy with: supabase functions deploy admin-actions
// Set the gate first:   supabase secrets set ADMIN_ACCESS_KEY=choose-a-long-random-value
//
// ADMIN_ACCESS_KEY is intentionally separate from the on-device "admin
// gate code" (EXPO_PUBLIC_DEFAULT_ADMIN_GATE_CODE). The gate code only
// decides which drawer items *this device* shows - it ships inside the
// app bundle, so it isn't a real secret. ADMIN_ACCESS_KEY never ships
// anywhere; the admin types it once into the Admin Panel screen.

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

  const expectedKey = Deno.env.get('ADMIN_ACCESS_KEY');
  const providedKey = String(body.admin_key ?? '');

  if (!expectedKey) {
    return jsonResponse({ error: 'ADMIN_ACCESS_KEY is not configured on the backend yet.' }, 500);
  }
  if (!providedKey || providedKey !== expectedKey) {
    return jsonResponse({ error: 'Invalid Admin Access Key.' }, 401);
  }

  const supabase = getSupabaseAdmin();
  const action = String(body.action ?? '');

  if (action === 'list_users') {
    const { data: settingsRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'gate_epoch')
      .maybeSingle();
    const currentEpoch = Number.parseInt(settingsRow?.value ?? '1', 10) || 1;

    const { data: users, error } = await supabase
      .from('app_users')
      .select('id, first_name, middle_name, last_name, email, birth_date, is_admin, verified_epoch, created_at')
      .order('created_at', { ascending: true });

    if (error) return jsonResponse({ error: error.message }, 500);

    const withStatus = (users ?? []).map((u) => ({ ...u, verified_current: u.verified_epoch === currentEpoch }));
    return jsonResponse({ users: withStatus, current_epoch: currentEpoch });
  }

  if (action === 'rotate_gate_code') {
    const newCode = String(body.new_code ?? '').trim();
    if (newCode.length < 4) return jsonResponse({ error: 'New code must be at least 4 characters.' }, 400);

    const { data: epochRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'gate_epoch')
      .maybeSingle();
    const nextEpoch = (Number.parseInt(epochRow?.value ?? '1', 10) || 1) + 1;

    const { error: codeError } = await supabase
      .from('app_settings')
      .upsert({ key: 'gate_code', value: newCode }, { onConflict: 'key' });
    if (codeError) return jsonResponse({ error: codeError.message }, 500);

    const { error: epochError } = await supabase
      .from('app_settings')
      .upsert({ key: 'gate_epoch', value: String(nextEpoch) }, { onConflict: 'key' });
    if (epochError) return jsonResponse({ error: epochError.message }, 500);

    await sendTelegramMessage(
      `KayVee gate code was rotated by admin (epoch ${nextEpoch}). The code itself is not included in this message. Users will be asked to re-enter it.`
    );

    return jsonResponse({ ok: true, epoch: nextEpoch });
  }

  return jsonResponse({ error: `Unknown action: ${action}` }, 400);
});
