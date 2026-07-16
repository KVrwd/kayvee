import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';

/**
 * Every screen wraps its content in this so phones fill edge-to-edge
 * while tablets/TVs/large windows get a centered, comfortably-wide
 * column instead of text stretched across the whole display.
 */
export default function ScreenContainer({ children, scroll = true, style }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, horizontalPadding } = useResponsive();

  const Wrapper = scroll ? ScrollView : View;
  const wrapperProps = scroll
    ? { contentContainerStyle: { flexGrow: 1 }, keyboardShouldPersistTaps: 'handled' }
    : { style: { flex: 1 } };

  return (
    <View style={[styles.outer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <Wrapper {...wrapperProps}>
        <View
          style={[
            styles.inner,
            { maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + 24 },
            style,
          ]}
        >
          {children}
        </View>
      </Wrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  inner: { flex: 1, width: '100%', alignSelf: 'center' },
});
