import { callEdgeFunction } from './supabaseClient';

// Every call here requires the real Admin Access Key - a server-side
// secret the admin types into the Admin Panel once, kept in SecureStore.
// This is deliberately separate from the on-device "admin gate code":
// the gate code only decides which drawer items show up on THIS device,
// it is not proof of anything to the server. The Admin Access Key is.

export async function listUsers(adminKey) {
  return callEdgeFunction('admin-actions', {
    action: 'list_users',
    admin_key: adminKey,
  });
}

export async function rotateGateCode(adminKey, newCode) {
  return callEdgeFunction('admin-actions', {
    action: 'rotate_gate_code',
    admin_key: adminKey,
    new_code: newCode,
  });
}
