import { Platform } from 'react-native';

const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

export const typography = {
  h1: { fontFamily, fontSize: 28, fontWeight: '700', letterSpacing: -0.3 },
  h2: { fontFamily, fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  h3: { fontFamily, fontSize: 18, fontWeight: '600' },
  body: { fontFamily, fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontFamily, fontSize: 15, fontWeight: '600' },
  caption: { fontFamily, fontSize: 12.5, fontWeight: '400' },
  button: { fontFamily, fontSize: 15.5, fontWeight: '700', letterSpacing: 0.2 },
  numeric: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }), fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
};
