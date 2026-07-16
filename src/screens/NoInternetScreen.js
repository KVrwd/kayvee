import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function NoInternetScreen() {
  const { theme, radius } = useTheme();
  // Just re-reading this hook is enough to re-render the moment the OS
  // reports connectivity back - there's nothing else to "retry".
  useNetworkStatus();

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.wrap}>
        <View style={[styles.dot, { backgroundColor: theme.danger, borderRadius: radius.pill }]} />
        <Text style={[typography.h2, { color: theme.textPrimary, marginTop: 20 }]}>No internet connection</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginTop: 8, textAlign: 'center' }]}>
          KayVee needs a connection to reach Supabase and Deriv. It will continue automatically once you're
          back online.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  dot: { width: 14, height: 14 },
});
