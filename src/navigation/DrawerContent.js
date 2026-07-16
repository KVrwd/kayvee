import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useTheme } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { typography } from '../theme/typography';

/**
 * Hamburger drawer. Theme toggle + navigation items in the middle, Admin
 * Panel entry only for the admin role, and the Lock button rigidly
 * anchored at the bottom regardless of content above.
 */
export default function DrawerContent(props) {
  const { theme, mode, radius, setThemeOverride } = useTheme();
  const { isAdmin, lockGate, profile } = useSession();
  const { navigation } = props;

  const isDark = mode === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1 }}>
        <Text style={[typography.h2, { color: theme.textPrimary, paddingHorizontal: 20, marginBottom: 4 }]}>
          KayVee
        </Text>
        {!!profile?.firstName && (
          <Text style={[typography.caption, { color: theme.textSecondary, paddingHorizontal: 20, marginBottom: 16 }]}>
            {profile.firstName}{isAdmin ? ' - admin' : ''}
          </Text>
        )}

        <MenuItem label="Dashboard" onPress={() => navigation.navigate('Dashboard')} theme={theme} />
        <MenuItem label="Trade" onPress={() => navigation.navigate('Trade')} theme={theme} />
        <MenuItem label="Accounts" onPress={() => navigation.navigate('Accounts')} theme={theme} />

        <View style={styles.divider(theme)} />

        <View style={styles.themeRow}>
          <Text style={[typography.body, { color: theme.textPrimary }]}>Dark mode</Text>
          <Pressable
            onPress={() => setThemeOverride(isDark ? 'light' : 'dark')}
            style={[styles.toggle, { backgroundColor: isDark ? theme.buttonPrimary : theme.surfaceBorder, borderRadius: radius.pill }]}
          >
            <View
              style={[
                styles.toggleKnob,
                { backgroundColor: theme.buttonPrimaryText, borderRadius: radius.pill },
                isDark && { alignSelf: 'flex-end' },
              ]}
            />
          </Pressable>
        </View>

        {isAdmin && (
          <>
            <View style={styles.divider(theme)} />
            <MenuItem label="Admin Panel" onPress={() => navigation.navigate('AdminPanel')} theme={theme} />
          </>
        )}
      </DrawerContentScrollView>

      <Pressable onPress={lockGate} style={[styles.lockButton, { borderColor: theme.danger, borderRadius: radius.md }]}>
        <Text style={[typography.button, { color: theme.danger }]}>Lock</Text>
      </Pressable>
    </View>
  );
}

function MenuItem({ label, onPress, theme }) {
  return (
    <Pressable onPress={onPress} style={styles.item} focusable>
      <Text style={[typography.body, { color: theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  item: { paddingHorizontal: 20, paddingVertical: 14 },
  divider: (theme) => ({ height: 1, backgroundColor: theme.divider, marginVertical: 10, marginHorizontal: 20 }),
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toggle: { width: 44, height: 26, padding: 3 },
  toggleKnob: { width: 20, height: 20 },
  lockButton: {
    margin: 20,
    height: 50,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
