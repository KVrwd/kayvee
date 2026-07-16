import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import { fetchGateSettings } from '../services/gateSettings';
import { sanitizeText, isPlausibleGateCode } from '../services/sanitize';

export default function SecretGateScreen() {
  const { theme, radius } = useTheme();
  const { unlockGate, verifiedEpoch } = useSession();

  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [wasRegated, setWasRegated] = useState(false);

  useEffect(() => {
    if (verifiedEpoch > 0) setWasRegated(true);
  }, [verifiedEpoch]);

  const handleContinue = async () => {
    setError('');
    const clean = sanitizeText(code, { maxLength: 16 });

    if (!agreed) {
      setError('You must accept the Privacy Policy and Terms of Service to continue.');
      return;
    }
    if (!isPlausibleGateCode(clean)) {
      setError('Wrong code.');
      return;
    }

    setChecking(true);
    try {
      const settings = await fetchGateSettings();
      if (clean === settings.adminGateCode) {
        await unlockGate({ role: 'admin', epoch: settings.epoch });
      } else if (clean === settings.gateCode) {
        await unlockGate({ role: 'user', epoch: settings.epoch });
      } else {
        setError('Wrong code.');
      }
    } finally {
      setChecking(false);
    }
  };

  // Safe fallbacks in case context hasn't populated yet
  const safeRadiusSm = radius?.sm ? radius.sm * 0.5 : 4;
  const safeRadiusMd = radius?.md || 8;
  const safeRadiusLg = radius?.lg || 12;

  return (
    <ScreenContainer>
      <View style={styles.centerFill}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>KayVee</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginTop: 8, marginBottom: 8 }]}>
          {wasRegated ? 'Access was reset. Enter the new access code to continue.' : 'Enter your access code to continue'}
        </Text>

        <TextInput
          value={code}
          onChangeText={(t) => setCode(sanitizeText(t, { maxLength: 16 }))}
          placeholder="Access code"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          secureTextEntry
          style={[
            styles.input,
            {
              color: theme.textPrimary,
              borderColor: theme.surfaceBorder,
              backgroundColor: theme.surface,
              borderRadius: safeRadiusMd,
              marginTop: 22,
            },
          ]}
        />

        {!!error && <Text style={[typography.caption, { color: theme.danger, marginTop: 10 }]}>{error}</Text>}

        <Pressable style={styles.checkboxRow} onPress={() => setAgreed((v) => !v)}>
          <View
            style={[
              styles.checkbox,
              { borderColor: theme.surfaceBorder, borderRadius: safeRadiusSm },
              agreed ? { backgroundColor: theme.buttonPrimary, borderColor: theme.buttonPrimary } : null,
            ]}
          />
          <Text style={[typography.caption, { color: theme.textSecondary, flex: 1 }]}>
            I agree to the{' '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://example.com/privacy')}>
              Privacy Policy
            </Text>{' '}
            and{' '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://example.com/terms')}>
              Terms of Service
            </Text>
            , and I understand I am solely responsible for all outcomes of using this application, including
            any financial trading losses.
          </Text>
        </Pressable>

        <Pressable
          onPress={handleContinue}
          disabled={checking}
          style={[
            styles.continueButton,
            { backgroundColor: theme.buttonPrimary, opacity: checking ? 0.6 : 1, borderRadius: safeRadiusLg },
          ]}
        >
          {checking ? (
            <ActivityIndicator color={theme.buttonPrimaryText} />
          ) : (
            <Text style={[typography.button, { color: theme.buttonPrimaryText }]}>Continue</Text>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, justifyContent: 'center', paddingVertical: 40 },
  input: {
    height: 54,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 2,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 24, gap: 10 },
  checkbox: { width: 20, height: 20, borderWidth: 1.4, marginTop: 2 },
  continueButton: { height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
});