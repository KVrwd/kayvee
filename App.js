v// MUST be the very first import
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SessionProvider, useSession } from './src/context/SessionContext';
import AppNavigator from './src/navigation/AppNavigator';
import { derivSocket } from './src/services/derivSocket';

// This component listens for the "kayvee://" redirect from the browser
function DeepLinkHandler() {
  const { addDerivAccount } = useSession();

  useEffect(() => {
    const handleDeepLink = async (event) => {
      const data = Linking.parse(event.url);
      
      // Extract parameters from the Deriv redirect URL
      const token = data.queryParams?.token1;
      const accountId = data.queryParams?.acct1;
      const currency = data.queryParams?.cur1 || 'USD';

      if (token && accountId) {
        console.log('OAuth token received, authorizing...');
        try {
          // 1. Authorize with the socket
          await derivSocket.authorize(token);
          
          // 2. Add the account to context (this triggers the AppNavigator switch)
          await addDerivAccount({ 
            id: accountId, 
            token: token, 
            currency: currency 
          });
          
          // 3. Optional: Store token specifically if needed by your services
          await SecureStore.setItemAsync(`kv_deriv_token_${accountId}`, token);
        } catch (e) {
          console.error('OAuth authorization failed', e);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [addDerivAccount]);

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
            {/* The listener must be inside the Providers to access useSession */}
            <DeepLinkHandler />
            <ThemedStatusBar />
            <AppNavigator />
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}