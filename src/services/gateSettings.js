import { supabase } from './supabaseClient';
import { ENV } from '../config/env';

// app_settings is a simple, publicly-readable key/value table (same
// pattern the app already used before). It only ever holds the two gate
// codes and the current epoch number - never anything sensitive - so an
// open anon-key SELECT here is an accepted, low-stakes tradeoff.
const KEYS = {
  GATE_CODE: 'gate_code',
  ADMIN_GATE_CODE: 'admin_gate_code',
  GATE_EPOCH: 'gate_epoch',
};

const FALLBACK = {
  gateCode: ENV.DEFAULT_GATE_CODE,
  adminGateCode: ENV.DEFAULT_ADMIN_GATE_CODE,
  epoch: 1,
};

export async function fetchGateSettings() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [KEYS.GATE_CODE, KEYS.ADMIN_GATE_CODE, KEYS.GATE_EPOCH]);

    if (error || !data || data.length === 0) return { ...FALLBACK };

    const map = Object.fromEntries(data.map((row) => [row.key, row.value]));
    return {
      gateCode: map[KEYS.GATE_CODE] || FALLBACK.gateCode,
      adminGateCode: map[KEYS.ADMIN_GATE_CODE] || FALLBACK.adminGateCode,
      epoch: Number.parseInt(map[KEYS.GATE_EPOCH], 10) || FALLBACK.epoch,
    };
  } catch {
    // Offline / transient network failure on first launch - fall back
    // to the bundled defaults rather than bricking the app.
    return { ...FALLBACK };
  }
}

export async function fetchGateEpoch() {
  const settings = await fetchGateSettings();
  return settings.epoch;
}
