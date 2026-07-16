import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated, 
  StyleSheet 
} from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '../context/SessionContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from '../context/ThemeContext';

import NoInternetScreen from '../screens/NoInternetScreen';
import SecretGateScreen from '../screens/SecretGateScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ConnectDerivScreen from '../screens/ConnectDerivScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TradeScreen from '../screens/TradeScreen';
import AccountsScreen from '../screens/AccountsScreen';
import AccountLinkScreen from '../screens/AccountLinkScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import DrawerContent from './DrawerContent';

const Stack = createStackNavigator();
const DRAWER_WIDTH = 280;

const screens = {
  Dashboard: DashboardScreen,
  Trade: TradeScreen,
  Accounts: AccountsScreen,
  AccountLink: AccountLinkScreen,
  AdminPanel: AdminPanelScreen,
};

function MainDrawer() {
  const { isAdmin } = useSession();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isDrawerOpen ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isDrawerOpen]);

  const routeNames = ['Dashboard', 'Trade', 'Accounts', 'AccountLink'];
  if (isAdmin) routeNames.push('AdminPanel');

  const fakeNavigation = {
    navigate: (name) => {
      if (screens[name]) {
        setActiveScreen(name);
      }
      setIsDrawerOpen(false);
    },
    closeDrawer: () => setIsDrawerOpen(false),
    openDrawer: () => setIsDrawerOpen(true),
    toggleDrawer: () => setIsDrawerOpen(!isDrawerOpen),
    goBack: () => setIsDrawerOpen(false),
  };

  const fakeState = {
    routes: routeNames.map(name => ({ key: name, name })),
    index: routeNames.indexOf(activeScreen),
  };

  const ActiveComponent = screens[activeScreen] || DashboardScreen;

  return (
    <View style={styles.container}>
      <View style={[styles.mainContent, { backgroundColor: theme.background }]}>
        <View style={[
          styles.header, 
          { 
            backgroundColor: theme.surface, 
            borderBottomColor: theme.surfaceBorder,
            paddingTop: insets.top 
          }
        ]}>
          <TouchableOpacity onPress={() => setIsDrawerOpen(true)} style={styles.menuButton}>
            <Text style={[styles.menuText, { color: theme.textPrimary }]}>☰</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            {activeScreen === 'AccountLink' ? 'Link Account' : activeScreen === 'AdminPanel' ? 'Admin Panel' : activeScreen}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1 }}>
          <ActiveComponent navigation={fakeNavigation} />
        </View>
      </View>

      {isDrawerOpen && (
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setIsDrawerOpen(false)} 
          style={styles.backdrop} 
        />
      )}

      <Animated.View style={[
        styles.drawerContainer, 
        { 
          backgroundColor: theme.surface,
          transform: [{ translateX: slideAnim }] 
        }
      ]}>
        <DrawerContent navigation={fakeNavigation} state={fakeState} />
      </Animated.View>
    </View>
  );
}

export default function AppNavigator() {
  const isOnline = useNetworkStatus();
  const { theme } = useTheme();
  const {
    loading,
    gateUnlocked,
    onboardingComplete,
    derivAccounts,
    derivPromptSeen,
  } = useSession();

  if (!isOnline) return <NoInternetScreen />;
  if (loading) return null;

  const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    dark: theme.mode === 'dark',
    colors: {
      ...base.colors,
      primary: theme.buttonPrimary,
      background: theme.background,
      card: theme.surface,
      text: theme.textPrimary,
      border: theme.surfaceBorder,
      notification: theme.danger,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!gateUnlocked ? (
          <Stack.Screen name="SecretGate" component={SecretGateScreen} />
        ) : !onboardingComplete ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !derivPromptSeen && derivAccounts.length === 0 ? (
          <Stack.Screen name="ConnectDeriv" component={ConnectDerivScreen} />
        ) : (
          <Stack.Screen name="MainApp" component={MainDrawer} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  menuButton: {
    padding: 8,
  },
  menuText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 99,
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 100,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 4, height: 0 },
  },
});