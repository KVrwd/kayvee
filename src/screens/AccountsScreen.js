import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import { derivSocket } from '../services/derivSocket';
import * as SecureStore from 'expo-secure-store';

export default function AccountsScreen({ navigation }) {
  const { theme, radius } = useTheme();
  const { derivAccounts, activeAccountId, switchActiveAccount, removeDerivAccount } = useSession();
  const [balances, setBalances] = useState({});

  // Best-effort balance peek for whichever account is currently authorized
  // on the shared socket - works for any account size, from a fraction of
  // a dollar up to large real-money balances, since it just mirrors
  // whatever Deriv reports back.
  useFocusEffect(
    useCallback(() => {
      const unsub = derivSocket.subscribeBalance((balance) => {
        if (!balance) return;
        setBalances((prev) => ({ ...prev, [balance.loginid]: balance }));
      });
      return unsub;
    }, [])
  );

  const handleSwitch = async (account) => {
    if (account.id === activeAccountId) return;
    await switchActiveAccount(account.id);
    try {
      const token = await SecureStore.getItemAsync(`kv_deriv_token_${account.id}`);
      if (token) {
        derivSocket.connect();
        derivSocket.authorize(token).catch(() => {});
      }
    } catch { /* best effort */ }
  };

  const handleRemove = (account) => {
    Alert.alert(
      'Remove account',
      `Remove ${account.nickname} from this device? This does not close or affect the account on Deriv.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeDerivAccount(account.id) },
      ]
    );
  };

  return (
    <ScreenContainer>
      <Text style={[typography.h2, { color: theme.textPrimary, marginTop: 8 }]}>Accounts</Text>
      <Text style={[typography.body, { color: theme.textSecondary, marginTop: 4, marginBottom: 16 }]}>
        Works with any account balance, demo or real, from cents to large sums.
      </Text>

      <FlatList
        data={derivAccounts}
        keyExtractor={(a) => a.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={[typography.body, { color: theme.textSecondary }]}>
            No accounts linked yet. Add one below.
          </Text>
        }
        renderItem={({ item }) => {
          const isActive = item.id === activeAccountId;
          const balance = balances[item.id];
          return (
            <Pressable
              onPress={() => handleSwitch(item)}
              onLongPress={() => handleRemove(item)}
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: isActive ? theme.buttonPrimary : theme.surfaceBorder,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: theme.textPrimary }]}>{item.nickname}</Text>
                <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 3 }]}>
                  {item.accountType === 'demo' ? 'Demo account' : 'Real account'}
                  {item.currency ? ` - ${item.currency}` : ''}
                </Text>
              </View>
              {balance && (
                <Text style={[typography.bodyStrong, { color: theme.textPrimary }]}>
                  {balance.currency} {Number(balance.balance).toFixed(2)}
                </Text>
              )}
              {isActive && (
                <View style={[styles.activePill, { backgroundColor: theme.buttonPrimary, borderRadius: radius.pill }]}>
                  <Text style={[typography.caption, { color: theme.buttonPrimaryText }]}>Active</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={() => navigation.navigate('AccountLink')}
        style={[styles.addButton, { borderColor: theme.buttonPrimary, borderRadius: radius.lg }]}
      >
        <Text style={[typography.button, { color: theme.buttonPrimary }]}>+ Add another account</Text>
      </Pressable>

      <Text style={[typography.caption, { color: theme.textTertiary, marginTop: 14 }]}>
        Tip: press and hold an account to remove it from this device.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  activePill: { paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10 },
  addButton: {
    height: 54,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
