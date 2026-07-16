import { callEdgeFunction } from './supabaseClient';

// Creates or updates this device's profile row server-side. Called once
// after onboarding (name/email/birth date) completes, and again every
// time the gate is (re)verified so verified_epoch stays current - that's
// what lets the admin panel show who has entered a rotated code.
export async function submitProfile({
  deviceId,
  firstName,
  middleName,
  lastName,
  email,
  birthDate, // ISO date string, e.g. '2000-01-31'
  isAdmin,
  verifiedEpoch,
}) {
  return callEdgeFunction('submit-profile', {
    device_id: deviceId,
    first_name: firstName,
    middle_name: middleName || null,
    last_name: lastName,
    email,
    birth_date: birthDate,
    is_admin: Boolean(isAdmin),
    verified_epoch: verifiedEpoch,
  });
}
