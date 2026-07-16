import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';

const MAX_SECONDS = 15;

/**
 * Sits directly above a "Run" style button. Every time `resetToken`
 * changes (symbol, contract type, stake, duration...) the countdown
 * restarts from `seconds` (capped at 15) - so changing your mind about
 * what to trade always buys you a fresh review window before you can
 * actually run it again.
 */
export default function CountdownRunButton({
  seconds = MAX_SECONDS,
  resetToken,
  label = 'Run trade',
  onRun,
  disabled = false,
  busy = false,
}) {
  const { theme, radius } = useTheme();
  const capped = Math.min(Math.max(seconds, 1), MAX_SECONDS);
  const [remaining, setRemaining] = useState(capped);
  const timerRef = useRef(null);

  useEffect(() => {
    setRemaining(capped);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken, capped]);

  const ready = remaining === 0 && !disabled;

  return (
    <View>
      <View
        style={[
          styles.countdownBox,
          {
            backgroundColor: ready ? theme.success + '22' : theme.surfaceElevated,
            borderColor: ready ? theme.success : theme.surfaceBorder,
            borderRadius: radius.md,
          },
        ]}
      >
        <Text style={[typography.caption, { color: ready ? theme.success : theme.textSecondary }]}>
          {ready ? 'Ready - you can run this now' : `Review your setup - run available in ${remaining}s`}
        </Text>
      </View>

      <Pressable
        disabled={!ready || busy}
        onPress={onRun}
        style={[
          styles.runButton,
          {
            backgroundColor: ready ? theme.buttonPrimary : theme.surfaceBorder,
            borderRadius: radius.lg,
            opacity: busy ? 0.7 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={theme.buttonPrimaryText} />
        ) : (
          <Text style={[typography.button, { color: ready ? theme.buttonPrimaryText : theme.textTertiary }]}>
            {ready ? label : `Wait ${remaining}s`}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  countdownBox: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  runButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
