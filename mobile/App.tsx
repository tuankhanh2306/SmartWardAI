/**
 * SmartWard AI Mobile — Root Application Entrypoint
 * Expo SDK 52 + TypeScript + React Navigation + TanStack Query + SQLite Offline Layer
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PersistentCivicHeader } from './src/components/PersistentCivicHeader';
import { WardSelectorModal } from './src/components/WardSelectorModal';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import { OfficerAuthProvider } from './src/context/OfficerAuthContext';
import { useWard, WardProvider } from './src/context/WardContext';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { OnboardingWardScreen } from './src/screens/OnboardingWardScreen';
import { initLocalDatabase } from './src/storage/sqliteDb';
import { COLORS } from './src/theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

const AppShell: React.FC = () => {
  const { hasCompletedOnboarding } = useWard();
  const [wardModalVisible, setWardModalVisible] = useState(false);

  useEffect(() => {
    void initLocalDatabase();
  }, []);

  if (!hasCompletedOnboarding) {
    return <OnboardingWardScreen />;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <PersistentCivicHeader onOpenWardSelector={() => setWardModalVisible(true)} />
      <View style={styles.navigatorWrap}>
        <NavigationContainer>
          <BottomTabNavigator />
        </NavigationContainer>
      </View>
      <WardSelectorModal
        visible={wardModalVisible}
        onClose={() => setWardModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AccessibilityProvider>
          <WardProvider>
            <OfficerAuthProvider>
              <StatusBar style="dark" backgroundColor={COLORS.card} />
              <AppShell />
            </OfficerAuthProvider>
          </WardProvider>
        </AccessibilityProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  navigatorWrap: {
    flex: 1,
  },
});
