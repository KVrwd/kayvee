import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { getOrCreateDeviceId } from '../services/deviceIdentity';
import { fetchGateEpoch } from '../services/gateSettings';
import { submitProfile } from '../services/profileApi';

const STORAGE_KEYS = {
  GATE_UNLOCKED: 'kv_gate_unlocked',
  ROLE: 'kv_role',
  VERIFIED_EPOCH: 'kv_verified_epoch',
  PROFILE: 'kv_profile', // JSON: { firstName, middleName, lastName, email, birthDate }
  ACCOUNTS: 'kv_deriv_accounts', // JSON array (metadata only - no API tokens here)
  ACTIVE_ACCOUNT_ID: 'kv_active_account_id',
  DERIV_PROMPT_SEEN: 'kv_deriv_prompt_seen',
};

// Re-check whether our device's verified_epoch still matches the server's
// current gate_epoch this often while the app is in the foreground. Real
// mobile OSes suspend JS the moment the app is backgrounded, so a rotated
// code cannot force a *running-in-the-background* app closed the instant
// admin presses "Ask Again" - it takes effect the next time the app is
// foregrounded or this interval fires, whichever comes first.
const REGATE_POLL_MS = 45000;

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState(null);

  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [role, setRole] = useState(null); // 'user' | 'admin' | null
  const [verifiedEpoch, setVerifiedEpoch] = useState(0);

  const [profile, setProfile] = useState(null);
  const [derivAccounts, setDerivAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [derivPromptSeen, setDerivPromptSeen] = useState(false);

  const pollRef = useRef(null);

  const isAdmin = role === 'admin';
  const onboardingComplete = Boolean(profile && profile.firstName && profile.lastName && profile.birthDate);

  // ---- bootstrap from device storage ----
  useEffect(() => {
    (async () => {
      try {
        const id = await getOrCreateDeviceId();
        setDeviceId(id);

        const [unlockedRaw, roleRaw, epochRaw, profileRaw, accountsRaw, activeRaw, promptSeenRaw] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.GATE_UNLOCKED),
          SecureStore.getItemAsync(STORAGE_KEYS.ROLE),
          SecureStore.getItemAsync(STORAGE_KEYS.VERIFIED_EPOCH),
          SecureStore.getItemAsync(STORAGE_KEYS.PROFILE),
          SecureStore.getItemAsync(STORAGE_KEYS.ACCOUNTS),
          SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_ACCOUNT_ID),
          SecureStore.getItemAsync(STORAGE_KEYS.DERIV_PROMPT_SEEN),
        ]);

        if (unlockedRaw === 'true') setGateUnlocked(true);
        if (roleRaw === 'admin' || roleRaw === 'user') setRole(roleRaw);
        if (epochRaw) setVerifiedEpoch(Number.parseInt(epochRaw, 10) || 0);
        if (profileRaw) {
          try { setProfile(JSON.parse(profileRaw)); } catch { /* corrupt - ignore */ }
        }
        if (accountsRaw) {
          try { setDerivAccounts(JSON.parse(accountsRaw)); } catch { /* corrupt - ignore */ }
        }
        if (activeRaw) setActiveAccountId(activeRaw);
        if (promptSeenRaw === 'true') setDerivPromptSeen(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- gate rotation watcher ----
  const checkForRegate = useCallback(async () => {
    if (!gateUnlocked) return;
    const currentEpoch = await fetchGateEpoch();
    if (currentEpoch && currentEpoch !== verifiedEpoch) {
      setGateUnlocked(false);
      await SecureStore.setItemAsync(STORAGE_KEYS.GATE_UNLOCKED, 'false');
    }
  }, [gateUnlocked, verifiedEpoch]);

  useEffect(() => {
    if (loading) return undefined;

    checkForRegate();
    pollRef.current = setInterval(checkForRegate, REGATE_POLL_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForRegate();
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      sub.remove();
    };
  }, [loading, checkForRegate]);

  // ---- actions ----
  const unlockGate = useCallback(async ({ role: newRole, epoch }) => {
    setGateUnlocked(true);
    setRole(newRole);
    setVerifiedEpoch(epoch);
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.GATE_UNLOCKED, 'true'),
      SecureStore.setItemAsync(STORAGE_KEYS.ROLE, newRole),
      SecureStore.setItemAsync(STORAGE_KEYS.VERIFIED_EPOCH, String(epoch)),
    ]);

    // Keep the server profile's verified_epoch/role fresh if we already
    // have a profile (i.e. this isn't first-run onboarding).
    if (deviceId && profile) {
      submitProfile({
        deviceId,
        firstName: profile.firstName,
        middleName: profile.middleName,
        lastName: profile.lastName,
        email: profile.email,
        birthDate: profile.birthDate,
        isAdmin: newRole === 'admin',
        verifiedEpoch: epoch,
      }).catch(() => {});
    }
  }, [deviceId, profile]);

  const lockGate = useCallback(async () => {
    setGateUnlocked(false);
    await SecureStore.setItemAsync(STORAGE_KEYS.GATE_UNLOCKED, 'false');
  }, []);

  const completeOnboarding = useCallback(async (newProfile) => {
    setProfile(newProfile);
    await SecureStore.setItemAsync(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));

    if (deviceId) {
      await submitProfile({
        deviceId,
        firstName: newProfile.firstName,
        middleName: newProfile.middleName,
        lastName: newProfile.lastName,
        email: newProfile.email,
        birthDate: newProfile.birthDate,
        isAdmin: role === 'admin',
        verifiedEpoch,
      }).catch(() => {});
    }
  }, [deviceId, role, verifiedEpoch]);

  const markDerivPromptSeen = useCallback(async () => {
    setDerivPromptSeen(true);
    await SecureStore.setItemAsync(STORAGE_KEYS.DERIV_PROMPT_SEEN, 'true');
  }, []);

  const persistAccounts = useCallback(async (list) => {
    setDerivAccounts(list);
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCOUNTS, JSON.stringify(list));
  }, []);

  const addDerivAccount = useCallback(async (account) => {
    const next = [...derivAccounts.filter((a) => a.id !== account.id), account];
    await persistAccounts(next);
    setActiveAccountId(account.id);
    await SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, account.id);
  }, [derivAccounts, persistAccounts]);

  const removeDerivAccount = useCallback(async (id) => {
    const next = derivAccounts.filter((a) => a.id !== id);
    await persistAccounts(next);
    await SecureStore.deleteItemAsync(`kv_deriv_token_${id}`).catch(() => {});
    if (activeAccountId === id) {
      const fallback = next[0]?.id ?? null;
      setActiveAccountId(fallback);
      if (fallback) await SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, fallback);
      else await SecureStore.deleteItemAsync(STORAGE_KEYS.ACTIVE_ACCOUNT_ID).catch(() => {});
    }
  }, [derivAccounts, activeAccountId, persistAccounts]);

  const switchActiveAccount = useCallback(async (id) => {
    setActiveAccountId(id);
    await SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, id);
  }, []);

  const activeAccount = derivAccounts.find((a) => a.id === activeAccountId) || null;

  const value = {
    loading,
    deviceId,
    gateUnlocked,
    role,
    isAdmin,
    verifiedEpoch,
    onboardingComplete,
    profile,
    derivAccounts,
    activeAccount,
    activeAccountId,
    derivPromptSeen,
    unlockGate,
    lockGate,
    completeOnboarding,
    addDerivAccount,
    removeDerivAccount,
    switchActiveAccount,
    markDerivPromptSeen,
    checkForRegate,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
