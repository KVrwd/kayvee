import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'kayvee_device_id';

// There is no Kayvee account system - a random id generated once per
// device stands in for "who this is" everywhere the backend needs a
// stable reference (profile row, gate verification, linked accounts).
export async function getOrCreateDeviceId() {
  try {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing) return existing;
  } catch {
    // fall through and mint a new one
  }

  const fresh = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh);
  return fresh;
}
