import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import { sanitizeName, isValidEmail, isPlausibleName, checkAdultAge } from '../services/sanitize';

const STEPS = ['email', 'name', 'birthdate'];

export default function OnboardingScreen() {
  const { theme, radius } = useTheme();
  const { completeOnboarding } = useSession();

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const step = STEPS[stepIndex];
  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const handleEmailNext = () => {
    setError('');
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    goNext();
  };

  const handleNameNext = () => {
    setError('');
    if (!isPlausibleName(firstName) || !isPlausibleName(lastName)) {
      setError('First and last name are required.');
      return;
    }
    goNext();
  };

  const handleFinish = async () => {
    setError('');
    const d = Number.parseInt(day, 10);
    const m = Number.parseInt(month, 10);
    const y = Number.parseInt(year, 10);

    if (!d || !m || !y || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) {
      setError('Enter a valid date of birth.');
      return;
    }

    const birthDate = new Date(y, m - 1, d);
    const { valid, age } = checkAdultAge(birthDate);
    if (!valid && age < 18) {
      setError('You must be 18 or older to use KayVee.');
      return;
    }
    if (!valid) {
      setError('Enter a valid date of birth.');
      return;
    }

    setSubmitting(true);
    try {
      await completeOnboarding({
        email: email.trim().toLowerCase(),
        firstName: sanitizeName(firstName),
        middleName: sanitizeName(middleName),
        lastName: sanitizeName(lastName),
        birthDate: birthDate.toISOString().slice(0, 10),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <Text style={[typography.caption, { color: theme.textTertiary, marginBottom: 6 }]}>
          Step {stepIndex + 1} of {STEPS.length}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceBorder, borderRadius: radius.pill }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.buttonPrimary,
                borderRadius: radius.pill,
                width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
              },
            ]}
          />
        </View>

        {step === 'email' && (
          <View style={styles.section}>
            <Text style={[typography.h2, { color: theme.textPrimary, marginTop: 24 }]}>What's your email?</Text>
            <Text style={[typography.body, { color: theme.textSecondary, marginTop: 6, marginBottom: 20 }]}>
              Used only so we can reach you about your account - it isn't used for anything else.
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, inputTheme(theme, radius)]}
            />
            {!!error && <Text style={[typography.caption, styles.errorText, { color: theme.danger }]}>{error}</Text>}
            <Pressable onPress={handleEmailNext} style={[styles.primaryButton, buttonTheme(theme, radius)]}>
              <Text style={[typography.button, { color: theme.buttonPrimaryText }]}>Save & continue</Text>
            </Pressable>
          </View>
        )}

        {step === 'name' && (
          <View style={styles.section}>
            <Text style={[typography.h2, { color: theme.textPrimary, marginTop: 24 }]}>What's your name?</Text>
            <Text style={[typography.body, { color: theme.textSecondary, marginTop: 6, marginBottom: 20 }]}>
              Please use your real name - it keeps account recovery and support smooth.
            </Text>
            <TextInput
              value={firstName}
              onChangeText={(t) => setFirstName(sanitizeName(t))}
              placeholder="First name"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, inputTheme(theme, radius)]}
            />
            <TextInput
              value={middleName}
              onChangeText={(t) => setMiddleName(sanitizeName(t))}
              placeholder="Middle name (optional)"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, inputTheme(theme, radius), { marginTop: 12 }]}
            />
            <TextInput
              value={lastName}
              onChangeText={(t) => setLastName(sanitizeName(t))}
              placeholder="Last name"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, inputTheme(theme, radius), { marginTop: 12 }]}
            />
            {!!error && <Text style={[typography.caption, styles.errorText, { color: theme.danger }]}>{error}</Text>}
            <Pressable onPress={handleNameNext} style={[styles.primaryButton, buttonTheme(theme, radius)]}>
              <Text style={[typography.button, { color: theme.buttonPrimaryText }]}>Continue</Text>
            </Pressable>
          </View>
        )}

        {step === 'birthdate' && (
          <View style={styles.section}>
            <Text style={[typography.h2, { color: theme.textPrimary, marginTop: 24 }]}>When were you born?</Text>
            <Text style={[typography.body, { color: theme.textSecondary, marginTop: 6, marginBottom: 20 }]}>
              You must be 18 or older to trade with KayVee.
            </Text>
            <View style={styles.dobRow}>
              <TextInput
                value={day}
                onChangeText={(t) => setDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="DD"
                placeholderTextColor={theme.textTertiary}
                keyboardType="number-pad"
                style={[styles.input, inputTheme(theme, radius), styles.dobInput]}
              />
              <TextInput
                value={month}
                onChangeText={(t) => setMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="MM"
                placeholderTextColor={theme.textTertiary}
                keyboardType="number-pad"
                style={[styles.input, inputTheme(theme, radius), styles.dobInput]}
              />
              <TextInput
                value={year}
                onChangeText={(t) => setYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="YYYY"
                placeholderTextColor={theme.textTertiary}
                keyboardType="number-pad"
                style={[styles.input, inputTheme(theme, radius), styles.dobInputWide]}
              />
            </View>
            {!!error && <Text style={[typography.caption, styles.errorText, { color: theme.danger }]}>{error}</Text>}
            <Pressable
              onPress={handleFinish}
              disabled={submitting}
              style={[styles.primaryButton, buttonTheme(theme, radius), { opacity: submitting ? 0.6 : 1 }]}
            >
              {submitting ? (
                <ActivityIndicator color={theme.buttonPrimaryText} />
              ) : (
                <Text style={[typography.button, { color: theme.buttonPrimaryText }]}>Finish</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

function inputTheme(theme, radius) {
  return {
    color: theme.textPrimary,
    borderColor: theme.surfaceBorder,
    backgroundColor: theme.surface,
    borderRadius: radius.md,
  };
}

function buttonTheme(theme, radius) {
  return { backgroundColor: theme.buttonPrimary, borderRadius: radius.lg };
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingVertical: 32 },
  progressTrack: { height: 6, width: '100%', overflow: 'hidden' },
  progressFill: { height: 6 },
  section: { marginTop: 4 },
  input: { height: 52, borderWidth: 1, paddingHorizontal: 16, fontSize: 15.5 },
  errorText: { marginTop: 10 },
  primaryButton: { height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  dobRow: { flexDirection: 'row', gap: 10 },
  dobInput: { flex: 1, textAlign: 'center' },
  dobInputWide: { flex: 1.6, textAlign: 'center' },
});
