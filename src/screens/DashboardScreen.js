import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import TickChart from '../components/TickChart';
import { derivSocket } from '../services/derivSocket';
import * as SecureStore from 'expo-secure-store';

const PREVIEW_SYMBOL = 'R_100';
const MAX_POINTS = 40;

export default function DashboardScreen({ navigation }) {
  const { theme, radius } = useTheme();
  const { activeAccount, profile, isAdmin } = useSession();

  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [balance, setBalance] = useState(null);
  const [prices, setPrices] = useState([]);

  useEffect(() => {
    derivSocket.connect();
    const unsub = derivSocket.onConnectionChange(setConnectionStatus);
    return unsub;
  }, []);

  // Re-authorize the socket for the active account whenever this screen
  // gains focus (covers switching accounts on the Accounts screen).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!activeAccount) return;
        try {
          const token = await SecureStore.getItemAsync(`kv_deriv_token_${activeAccount.id}`);
          if (token && !cancelled) {
            derivSocket.connect();
            await derivSocket.authorize(token).catch(() => {});
          }
        } catch { /* best effort */ }
      })();
      return () => { cancelled = true; };
    }, [activeAccount])
  );

  useFocusEffect(
    useCallback(() => {
      const unsub = derivSocket.subscribeBalance((b) => setBalance(b));
      return unsub;
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const unsub = derivSocket.subscribeTicks(PREVIEW_SYMBOL, (tick) => {
        setPrices((prev) => [...prev, tick.quote].slice(-MAX_POINTS));
      });
      return unsub;
    }, [])
  );

  const statusLabel = {
    connecting: 'Connecting...',
    open: 'Connected',
    closed: 'Reconnecting...',
    error: 'Connection issue',
    idle: 'Starting...',
  }[connectionStatus] || 'Starting...';

  const statusColor = connectionStatus === 'open' ? theme.success : theme.textTertiary;

  return (
    <ScreenContainer>
      <Text style={[typography.caption, { color: theme.textTertiary, marginTop: 8 }]}>
        Welcome{profile?.firstName ? `, ${profile.firstName}` : ''}
        {isAdmin ? ' - admin' : ''}
      </Text>
      <Text style={[typography.h1, { color: theme.textPrimary, marginTop: 4, marginBottom: 6 }]}>Dashboard</Text>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor, borderRadius: radius.pill }]} />
        <Text style={[typography.caption, { color: theme.textSecondary }]}>{statusLabel}</Text>
      </View>

      <View style={[styles.balanceCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder, borderRadius: radius.xl }]}>
        {activeAccount ? (
          <>
            <Text style={[typography.caption, { color: theme.textSecondary }]}>
              {activeAccount.nickname} - {activeAccount.accountType === 'demo' ? 'Demo' : 'Real'}
            </Text>
            <Text style={[typography.numeric, { color: theme.textPrimary, marginTop: 6 }]}>
              {balance ? `${balance.currency} ${Number(balance.balance).toFixed(2)}` : '...'}
            </Text>
          </>
        ) : (
          <>
            <Text style={[typography.bodyStrong, { color: theme.textPrimary }]}>No account linked yet</Text>
            <Text style={[typography.body, { color: theme.textSecondary, marginTop: 4 }]}>
              Link a demo or real Deriv account (any balance) to see live numbers here.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Accounts')}
              style={[styles.linkButton, { backgroundColor: theme.buttonPrimary, borderRadius: radius.lg }]}
            >
              <Text style={[typography.button, { color: theme.buttonPrimaryText }]}>Link an account</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={[typography.bodyStrong, { color: theme.textPrimary, marginTop: 22, marginBottom: 10 }]}>
        Volatility 100 Index - live
      </Text>
      <TickChart prices={prices} live={connectionStatus === 'open'} />

      <Pressable
        onPress={() => navigation.navigate('Trade')}
        style={[styles.tradeButton, { backgroundColor: theme.buttonPrimary, borderRadius: radius.lg }]}
      >
        <Text style={[typography.button, { color: theme.buttonPrimaryText }]}>Go to Trade</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  statusDot: { width: 8, height: 8 },
  balanceCard: { borderWidth: 1, padding: 20 },
  linkButton: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  tradeButton: { height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 12 },
});
