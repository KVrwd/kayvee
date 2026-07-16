import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import { listUsers, rotateGateCode } from '../services/adminApi';

const ADMIN_KEY_STORAGE = 'kv_admin_access_key';

export default function AdminPanelScreen() {
  const { theme, radius } = useTheme();

  const [adminKey, setAdminKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState('');

  const [newCode, setNewCode] = useState('');
  const [rotating, setRotating] = useState(false);
  const [rotateMessage, setRotateMessage] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync(ADMIN_KEY_STORAGE).then((saved) => {
      if (saved) {
        setAdminKey(saved);
        setKeySaved(true);
      }
    });
  }, []);

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    await SecureStore.setItemAsync(ADMIN_KEY_STORAGE, keyInput.trim());
    setAdminKey(keyInput.trim());
    setKeySaved(true);
  };

  const handleForgetKey = async () => {
    await SecureStore.deleteItemAsync(ADMIN_KEY_STORAGE);
    setAdminKey('');
    setKeySaved(false);
    setUsers([]);
  };

  const handleLoadUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const res = await listUsers(adminKey);
      setUsers(res.users || []);
    } catch (e) {
      setUsersError(e.message || 'Could not load users - check your Admin Access Key.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAskAgain = () => {
    if (newCode.trim().length < 4) {
      setRotateMessage('Enter a new code with at least 4 characters.');
      return;
    }
    Alert.alert(
      'Ask everyone again?',
      'Every device, including yours, will need to re-enter this new code the next time it opens (or within about 45 seconds if already open). Any trades already running are unaffected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ask again',
          style: 'destructive',
          onPress: async () => {
            setRotating(true);
            setRotateMessage('');
            try {
              await rotateGateCode(adminKey, newCode.trim());
              setRotateMessage('Done - a Telegram alert was sent, and users will be asked to re-enter.');
              setNewCode('');
            } catch (e) {
              setRotateMessage(e.message || 'Could not rotate the code - check your Admin Access Key.');
            } finally {
              setRotating(false);
            }
          },
        },
      ]
    );
  };

  const nonAdminUsers = users.filter((u) => !u.is_admin);

  return (
    <ScreenContainer>
      <Text style={[typography.h2, { color: theme.textPrimary, marginTop: 8, marginBottom: 4 }]}>Admin Panel</Text>
      <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 18 }]}>
        Admin trades on the same Dashboard and Trade screens as everyone else - this panel is additional.
      </Text>

      {!keySaved ? (
        <View style={[styles.card, cardTheme(theme, radius)]}>
          <Text style={[typography.bodyStrong, { color: theme.textPrimary }]}>Admin Access Key</Text>
          <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4, marginBottom: 12 }]}>
            A separate secret from the gate code - set on the backend, never shipped inside the app. Required to
            view the user list or rotate the gate code.
          </Text>
          <TextInput
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="Admin Access Key"
            placeholderTextColor={theme.textTertiary}
            secureTextEntry
            autoCapitalize="none"
            style={[styles.input, inputTheme(theme, radius)]}
          />
          <Pressable onPress={handleSaveKey} style={[styles.primaryButton, { backgroundColor: theme.buttonPrimary, borderRadius: radius.lg }]}>
            <Text style={[typography.button, { color: theme.buttonPrimaryText }]}>Save key on this device</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.card, cardTheme(theme, radius)]}>
            <View style={styles.rowBetween}>
              <Text style={[typography.bodyStrong, { color: theme.textPrimary }]}>
                Users {nonAdminUsers.length ? `(${nonAdminUsers.length})` : ''}
              </Text>
              <Pressable onPress={handleLoadUsers}>
                <Text style={{ color: theme.accent, fontWeight: '600' }}>{loadingUsers ? 'Loading...' : 'Refresh'}</Text>
              </Pressable>
            </View>

            {!!usersError && <Text style={[typography.caption, { color: theme.danger, marginTop: 8 }]}>{usersError}</Text>}
            {loadingUsers && <ActivityIndicator style={{ marginTop: 12 }} color={theme.buttonPrimary} />}

            {!loadingUsers &&
              nonAdminUsers.map((u, idx) => (
                <View key={u.id || idx} style={[styles.userRow, { borderColor: theme.surfaceBorder }]}>
                  <Text style={[typography.caption, { color: theme.textTertiary, width: 24 }]}>{idx + 1}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: theme.textPrimary }]}>
                      {[u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ')}
                    </Text>
                    <Text style={[typography.caption, { color: theme.textSecondary }]}>{u.email}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: u.verified_current ? theme.success + '22' : theme.textTertiary + '22',
                        borderRadius: radius.pill,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, color: u.verified_current ? theme.success : theme.textTertiary, fontWeight: '700' }}>
                      {u.verified_current ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
                </View>
              ))}

            {!loadingUsers && nonAdminUsers.length === 0 && !usersError && (
              <Text style={[typography.caption, { color: theme.textTertiary, marginTop: 10 }]}>
                Press Refresh to load the user list.
              </Text>
            )}
          </View>

          <View style={[styles.card, cardTheme(theme, radius)]}>
            <Text style={[typography.bodyStrong, { color: theme.textPrimary }]}>Ask Again (rotate gate code)</Text>
            <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4, marginBottom: 12 }]}>
              Sets a new access code and asks every device to re-enter it. You'll get a Telegram alert when this
              happens (it never includes the code itself), and you'll see who has re-entered above.
            </Text>
            <TextInput
              value={newCode}
              onChangeText={setNewCode}
              placeholder="New access code"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="characters"
              style={[styles.input, inputTheme(theme, radius)]}
            />
            {!!rotateMessage && <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 8 }]}>{rotateMessage}</Text>}
            <Pressable
              onPress={handleAskAgain}
              disabled={rotating}
              style={[styles.primaryButton, { backgroundColor: theme.danger, borderRadius: radius.lg, opacity: rotating ? 0.6 : 1 }]}
            >
              {rotating ? <ActivityIndicator color="#fff" /> : <Text style={[typography.button, { color: '#fff' }]}>Ask Again</Text>}
            </Pressable>
          </View>

          <Pressable onPress={handleForgetKey} style={{ marginTop: 4, marginBottom: 20 }}>
            <Text style={[typography.caption, { color: theme.textTertiary, textAlign: 'center' }]}>
              Forget Admin Access Key on this device
            </Text>
          </Pressable>
        </>
      )}
    </ScreenContainer>
  );
}

function cardTheme(theme, radius) {
  return { backgroundColor: theme.surface, borderColor: theme.surfaceBorder, borderRadius: radius.lg };
}
function inputTheme(theme, radius) {
  return { color: theme.textPrimary, borderColor: theme.surfaceBorder, backgroundColor: theme.background, borderRadius: radius.md };
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, marginBottom: 16 },
  input: { height: 50, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  primaryButton: { height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4 },
});
