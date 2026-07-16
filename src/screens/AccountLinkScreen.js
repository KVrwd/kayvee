import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import { derivSocket } from '../services/derivSocket';
import * as SecureStore from 'expo-secure-store';

export default function AccountLinkScreen({ navigation }) {
  const { theme, radius } = useTheme();
  const { addDerivAccount } = useSession();

  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  // OAuth Trigger - Pulling the unified modern App ID from .env
  const handleLoginWithDeriv = async () => {
    const bridgeUrl = process.env.EXPO_PUBLIC_DERIV_REDIRECT_URI;
    const appId = process.env.EXPO_PUBLIC_DERIV_APP_ID;
    
    const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&brand=deriv&language=en&redirect_uri=${encodeURIComponent(bridgeUrl)}`;
    await Linking.openURL(oauthUrl);
  };

  const handleConnect = async () => {
    setError('');
    const clean = token.trim();
    if (clean.length < 10) {
      setError('That token looks too short - copy it again from Deriv.');
      return;
    }
    setConnecting(true);
    try {
      derivSocket.logout();
      derivSocket.connect();
      await waitForOpen(derivSocket);
      const result = await derivSocket.authorize(clean);
      const auth = result.authorize;
      if (!auth) throw new Error('Could not verify that token.');
      await SecureStore.setItemAsync(`kv_deriv_token_${auth.loginid}`, clean);
      await addDerivAccount({
        id: auth.loginid,
        loginId: auth.loginid,
        accountType: auth.is_virtual ? 'demo' : 'real',
        nickname: auth.loginid,
        currency: auth.currency,
      });
      navigation.goBack();
    } catch (e) {
      setError(e.message || 'Could not connect to Deriv. Check the token and try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <Text style={[typography.h2, { color: theme.textPrimary }]}>Link a Deriv account</Text>
        
        <Pressable 
          onPress={handleLoginWithDeriv} 
          style={[styles.primaryButton, { backgroundColor: theme.accent, borderRadius: radius.lg, marginTop: 20 }]}
        >
          <Text style={[typography.button, { color: '#fff' }]}>Login with Deriv</Text>
        </Pressable>

        <Text style={[typography.caption, { color: theme.textTertiary, marginVertical: 20, textAlign: 'center' }]}>
          OR PASTE TOKEN
        </Text>

        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="Paste your Deriv API token"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            { color: theme.textPrimary, borderColor: theme.surfaceBorder, backgroundColor: theme.surface, borderRadius: radius.md },
          ]}
        />
        {!!error && <Text style={[typography.caption, { color: theme.danger, marginTop: 10 }]}>{error}</Text>}

        <Pressable
          onPress={handleConnect}
          disabled={connecting}
          style={[
            styles.primaryButton,
            { backgroundColor: theme.buttonPrimary, borderRadius: radius.lg, opacity: connecting ? 0.6 : 1 },
          ]}
        >
          {connecting ? (
            <ActivityIndicator color={theme.buttonPrimaryText} />
          ) : (
            <Text style={[typography.button, { color: theme.buttonPrimaryText }]}>Connect account</Text>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function waitForOpen(socket, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (socket.status === 'open') { resolve(); return; }
    let settled = false;
    let unsub = () => {};
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsub();
      reject(new Error('Connection to Deriv timed out.'));
    }, timeoutMs);
    unsub = socket.onConnectionChange((status) => {
      if (settled) return;
      if (status === 'open') {
        settled = true;
        clearTimeout(timer);
        unsub();
        resolve();
      } else if (status === 'error') {
        settled = true;
        clearTimeout(timer);
        unsub();
        reject(new Error('Could not reach Deriv.'));
      }
    });
  });
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingVertical: 32 },
  input: { height: 54, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  primaryButton: { height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
});