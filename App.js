// MUST be the very first import
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SessionProvider } from './src/context/SessionContext';
import AppNavigator from './src/navigation/AppNavigator';
import { derivSocket } from './src/services/derivSocket'; // Make sure this path is correct

// This component listens for the "kayvee://" redirect from the browser
function DeepLinkHandler() {
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const data = Linking.parse(event.url);
      const token = data.queryParams?.token1;

      if (token) {
        console.log('OAuth token received, authorizing...');
        try {
          // 1. Authorize with the socket
          await derivSocket.authorize(token);
          // 2. Save the token securely
          await SecureStore.setItemAsync('kv_deriv_token', token);
          // Note: AppNavigator will detect the session change and update UI automatically
        } catch (e) {
          console.error('OAuth authorization failed', e);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  return null;
}

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme.statusBar} translucent backgroundColor="transparent" />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SessionProvider>
            {/* The listener must be inside the Providers to function correctly */}
            <DeepLinkHandler />
            <ThemedStatusBar />
            <AppNavigator />
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}