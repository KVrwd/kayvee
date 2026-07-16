import { createClient } from '@supabase/supabase-js';
import { ENV } from '../config/env';

// No Kayvee account system exists (see SessionContext), so Supabase Auth
// itself is never used - turning it fully off avoids it trying to touch
// browser-only storage APIs that don't exist in React Native.
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Small helper for calling our Supabase Edge Functions with a JSON body.
// supabase-js wraps any non-2xx response in a generic FunctionsHttpError -
// this pulls the specific {error: "..."} message our functions return out
// of that wrapper so the UI can show something useful ("Invalid Admin
// Access Key.") instead of a generic "Edge Function returned a non-2xx
// status code" message.
export async function callEdgeFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const detail = await extractEdgeFunctionErrorMessage(error);
    throw new Error(detail || error.message || 'Something went wrong.');
  }
  return data;
}

async function extractEdgeFunctionErrorMessage(error) {
  try {
    if (error?.context && typeof error.context.json === 'function') {
      const parsed = await error.context.json();
      if (parsed && typeof parsed.error === 'string') return parsed.error;
    }
  } catch {
    // response body already consumed, or wasn't JSON - fall through
  }
  return null;
}
