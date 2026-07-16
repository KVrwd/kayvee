import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

/**
 * Renders recent tick prices as a simple line, with a pulse dot on the
 * newest point while `live` is true - this is "the place where it says
 * the bot is running with a blue line".
 */
export default function TickChart({ prices = [], height = 120, live = false }) {
  const { theme, radius } = useTheme();

  const points = useMemo(() => {
    if (prices.length < 2) return '';
    const width = 320; // viewBox width; the SVG scales to the container
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    const stepX = width / (prices.length - 1);

    return prices
      .map((p, i) => {
        const x = i * stepX;
        const y = height - 12 - ((p - min) / span) * (height - 24);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [prices, height]);

  const lastPoint = points ? points.split(' ').pop().split(',') : null;

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor: theme.surface, borderColor: theme.surfaceBorder, borderRadius: radius.lg },
      ]}
    >
      {points ? (
        <Svg width="100%" height={height} viewBox={`0 0 320 ${height}`} preserveAspectRatio="none">
          <Polyline points={points} fill="none" stroke={theme.chartLine} strokeWidth={2} />
          {lastPoint && (
            <Circle cx={lastPoint[0]} cy={lastPoint[1]} r={live ? 4 : 3} fill={theme.chartLine} />
          )}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
});
