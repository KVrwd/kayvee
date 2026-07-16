// Symbol codes match Deriv's own WebSocket API naming so they can be sent
// straight through to `ticks` / `proposal` / `buy` without translation.

export const SYNTHETIC_INDICES = [
  { code: 'R_10', label: 'Volatility 10 Index', enabled: true },
  { code: 'R_25', label: 'Volatility 25 Index', enabled: true },
  { code: 'R_50', label: 'Volatility 50 Index', enabled: true },
  { code: 'R_75', label: 'Volatility 75 Index', enabled: true },
  { code: 'R_100', label: 'Volatility 100 Index', enabled: true },
  { code: '1HZ10V', label: 'Volatility 10 (1s) Index', enabled: true },
  { code: '1HZ25V', label: 'Volatility 25 (1s) Index', enabled: true },
  { code: '1HZ50V', label: 'Volatility 50 (1s) Index', enabled: true },
  { code: '1HZ75V', label: 'Volatility 75 (1s) Index', enabled: true },
  { code: '1HZ100V', label: 'Volatility 100 (1s) Index', enabled: true },
  { code: 'stpRNG', label: 'Step Index', enabled: true },
  { code: 'JD10', label: 'Jump 10 Index', enabled: true },
  { code: 'JD25', label: 'Jump 25 Index', enabled: true },
  { code: 'JD50', label: 'Jump 50 Index', enabled: true },
  { code: 'JD75', label: 'Jump 75 Index', enabled: true },
  { code: 'JD100', label: 'Jump 100 Index', enabled: true },
  // Intentionally disabled per product decision - selecting these shows
  // "Not yet established" instead of opening the trade setup.
  { code: 'BOOM300N', label: 'Boom 300 Index', enabled: false },
  { code: 'BOOM500', label: 'Boom 500 Index', enabled: false },
  { code: 'BOOM1000', label: 'Boom 1000 Index', enabled: false },
  { code: 'CRASH300N', label: 'Crash 300 Index', enabled: false },
  { code: 'CRASH500', label: 'Crash 500 Index', enabled: false },
  { code: 'CRASH1000', label: 'Crash 1000 Index', enabled: false },
];

export const FOREX_PAIRS = [
  { code: 'frxEURUSD', label: 'EUR/USD', enabled: true },
  { code: 'frxGBPUSD', label: 'GBP/USD', enabled: true },
  { code: 'frxUSDJPY', label: 'USD/JPY', enabled: true },
  { code: 'frxAUDUSD', label: 'AUD/USD', enabled: true },
  { code: 'frxUSDCHF', label: 'USD/CHF', enabled: true },
  { code: 'frxUSDCAD', label: 'USD/CAD', enabled: true },
  { code: 'frxEURGBP', label: 'EUR/GBP', enabled: true },
  { code: 'frxEURJPY', label: 'EUR/JPY', enabled: true },
];

export const ALL_SYMBOLS = [...SYNTHETIC_INDICES, ...FOREX_PAIRS];

// "Options" contract types. `digitsOnly` contracts only take tick durations
// and need a 0-9 barrier; the rest take tick/second/minute durations.
export const CONTRACT_TYPES = [
  { code: 'CALL_PUT', label: 'Rise / Fall', calls: ['CALL', 'PUT'], callLabels: ['Rise', 'Fall'], needsBarrier: false, durationUnits: ['t', 's', 'm'] },
  { code: 'HIGHER_LOWER', label: 'Higher / Lower', calls: ['CALL', 'PUT'], callLabels: ['Higher', 'Lower'], needsBarrier: true, durationUnits: ['s', 'm'] },
  { code: 'TOUCH_NOTOUCH', label: 'Touch / No Touch', calls: ['ONETOUCH', 'NOTOUCH'], callLabels: ['Touch', 'No Touch'], needsBarrier: true, durationUnits: ['m', 'h'] },
  { code: 'MATCH_DIFFER', label: 'Matches / Differs', calls: ['DIGITMATCH', 'DIGITDIFF'], callLabels: ['Matches', 'Differs'], needsBarrier: true, digitBarrier: true, durationUnits: ['t'] },
  { code: 'EVEN_ODD', label: 'Even / Odd', calls: ['DIGITEVEN', 'DIGITODD'], callLabels: ['Even', 'Odd'], needsBarrier: false, durationUnits: ['t'] },
  { code: 'OVER_UNDER', label: 'Over / Under', calls: ['DIGITOVER', 'DIGITUNDER'], callLabels: ['Over', 'Under'], needsBarrier: true, digitBarrier: true, durationUnits: ['t'] },
];

export const DURATION_UNIT_LABELS = { t: 'ticks', s: 'seconds', m: 'minutes', h: 'hours', d: 'days' };
