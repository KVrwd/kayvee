// Central place that reads EXPO_PUBLIC_* variables so the rest of the app
// never touches process.env directly. Fallbacks match the bundled .env,
// so a misconfigured build degrades gracefully instead of throwing at boot.

export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

  DERIV_APP_ID: process.env.EXPO_PUBLIC_DERIV_APP_ID ?? '33PS9fv2cnxtaxyxyKLXL',
  DERIV_FALLBACK_APP_ID: process.env.EXPO_PUBLIC_DERIV_FALLBACK_APP_ID ?? '1089',
  DERIV_WS_URL: process.env.EXPO_PUBLIC_DERIV_WS_URL ?? 'wss://ws.derivws.com/websockets/v3',

  ADMIN_EMAIL: process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? 'kingvic7412@gmail.com',

  DEFAULT_GATE_CODE: process.env.EXPO_PUBLIC_DEFAULT_GATE_CODE ?? '321456V',
  DEFAULT_ADMIN_GATE_CODE: process.env.EXPO_PUBLIC_DEFAULT_ADMIN_GATE_CODE ?? '123654V',
};

export function isConfigured() {
  return Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY);
}