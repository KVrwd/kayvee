// These produce an informational bias from recent price history - they
// are signals to help a human decide, not an auto-trading engine. Nothing
// here places a trade; the Trade screen always requires the person to
// review the setup and wait out the Run countdown before anything is sent
// to Deriv.

export const STRATEGY_DISCLAIMER =
  'These are simple technical signals based on recent price history, not a guarantee of any outcome. ' +
  'Synthetic indices and forex can move against any signal. Trade only what you can afford to lose.';

function sma(values, length) {
  if (values.length < length) return null;
  const slice = values.slice(-length);
  return slice.reduce((sum, v) => sum + v, 0) / length;
}

export function movingAverageSignal(prices, shortLen = 5, longLen = 20) {
  const shortMA = sma(prices, shortLen);
  const longMA = sma(prices, longLen);
  if (shortMA == null || longMA == null) {
    return { bias: 'Neutral', reason: 'Not enough ticks yet', shortMA, longMA };
  }
  if (shortMA > longMA) return { bias: 'Rise', reason: `Short average above long average`, shortMA, longMA };
  if (shortMA < longMA) return { bias: 'Fall', reason: `Short average below long average`, shortMA, longMA };
  return { bias: 'Neutral', reason: 'Averages are level', shortMA, longMA };
}

export function rsiSignal(prices, period = 14) {
  if (prices.length < period + 1) return { bias: 'Neutral', reason: 'Not enough ticks yet', rsi: null };

  let gains = 0;
  let losses = 0;
  const recent = prices.slice(-(period + 1));
  for (let i = 1; i < recent.length; i += 1) {
    const change = recent[i] - recent[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgLoss === 0 ? avgGain : avgGain / avgLoss;
  const rsi = avgLoss === 0 && avgGain === 0 ? 50 : 100 - 100 / (1 + rs);

  if (rsi >= 70) return { bias: 'Fall', reason: 'RSI suggests overbought', rsi };
  if (rsi <= 30) return { bias: 'Rise', reason: 'RSI suggests oversold', rsi };
  return { bias: 'Neutral', reason: 'RSI in neutral range', rsi };
}

// Frequency of the last digit across recent quotes - purely descriptive,
// deliberately NOT framed as a prediction (digits on synthetic indices are
// designed to be close to uniformly random).
export function lastDigitStats(prices) {
  const counts = new Array(10).fill(0);
  prices.forEach((p) => {
    const digit = Math.abs(Math.round(p * 100)) % 10;
    counts[digit] += 1;
  });
  const total = prices.length || 1;
  return counts.map((c, digit) => ({ digit, count: c, pct: Math.round((c / total) * 100) }));
}

export const STRATEGIES = [
  { id: 'manual', label: 'Manual', description: 'You choose everything yourself, no signal shown.' },
  { id: 'trend', label: 'Trend Following', description: 'Moving-average crossover on recent ticks.' },
  { id: 'reversion', label: 'Mean Reversion', description: 'RSI overbought / oversold on recent ticks.' },
];
