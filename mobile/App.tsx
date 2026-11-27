/**
 * SmartWard AI Mobile — Root Application Entrypoint
 * Expo SDK 58 + TypeScript + Multi-Phone Responsive Preview Bar (Web) + Native SafeArea
 */

import React, { useEffect, useState } from 'react';
import { Modal, NativeModules, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { configureRuntimeApiBaseUrl } from './src/api/client';
import { PersistentCivicHeader } from './src/components/PersistentCivicHeader';
import { WardSelectorModal } from './src/components/WardSelectorModal';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import { OfficerAuthProvider } from './src/context/OfficerAuthContext';
import { useWard, WardProvider } from './src/context/WardContext';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';
import { OfficerMobileAuditScreen } from './src/screens/OfficerMobileAuditScreen';
import { OnboardingWardScreen } from './src/screens/OnboardingWardScreen';
import { initLocalDatabase } from './src/storage/sqliteDb';
import { COLORS, RADIUS, SPACING } from './src/theme/tokens';

configureRuntimeApiBaseUrl({
  platformOs: Platform.OS,
  scriptUrl: (NativeModules as { SourceCode?: { scriptURL?: string } })?.SourceCode?.scriptURL,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

type WebPhonePresetKey = 'se' | 'android' | 'iphone' | 'promax' | 'full';

const WEB_PHONE_PRESETS: Array<{
  key: WebPhonePresetKey;
  label: string;
  width?: number;
  height?: number;
}> = [
  { key: 'se', label: 'SE 320px', width: 320, height: 667 },
  { key: 'android', label: 'Android 360px', width: 360, height: 800 },
  { key: 'iphone', label: 'iPhone 390px', width: 390, height: 844 },
  { key: 'promax', label: 'Pro Max 430px', width: 430, height: 932 },
  { key: 'full', label: 'Toàn màn hình' },
];

const AppShell: React.FC = () => {
  const { hasCompletedOnboarding } = useWard();
  const [wardModalVisible, setWardModalVisible] = useState(false);
  const [officerModalVisible, setOfficerModalVisible] = useState(false);

  useEffect(() => {
    void initLocalDatabase();
  }, []);

  if (!hasCompletedOnboarding) {
    return <OnboardingWardScreen />;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <PersistentCivicHeader
        onOpenWardSelector={() => setWardModalVisible(true)}
        onOpenOfficerDesk={() => setOfficerModalVisible(true)}
      />
      <View style={styles.navigatorWrap}>
        <NavigationContainer>
          <BottomTabNavigator />
        </NavigationContainer>
      </View>
      <WardSelectorModal
        visible={wardModalVisible}
        onClose={() => setWardModalVisible(false)}
      />
      <Modal
        visible={officerModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOfficerModalVisible(false)}
      >
        <SafeAreaView style={styles.officerModalRoot} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.officerModalHeader}>
            <Text style={styles.officerModalTitle}>Bàn Cán Bộ Một Cửa</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng Bàn Cán Bộ"
              onPress={() => setOfficerModalVisible(false)}
              style={styles.officerModalCloseBtn}
            >
              <X size={20} color={COLORS.onPrimary} />
            </Pressable>
          </View>
          <OfficerMobileAuditScreen />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default function App() {
  const [webPreset, setWebPreset] = useState<WebPhonePresetKey>('iphone');

  const appTree = (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AccessibilityProvider>
          <WardProvider>
            <OfficerAuthProvider>
              <StatusBar style="light" />
              <AppShell />
            </OfficerAuthProvider>
          </WardProvider>
        </AccessibilityProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    const activePreset =
      WEB_PHONE_PRESETS.find((p) => p.key === webPreset) || WEB_PHONE_PRESETS[2];
    const isFull = activePreset.key === 'full';

    return (
      <View style={styles.webViewport}>
        <View style={styles.webToolbar}>
          {WEB_PHONE_PRESETS.map((preset) => {
            const active = preset.key === webPreset;
            return (
              <Pressable
                key={preset.key}
                onPress={() => setWebPreset(preset.key)}
                style={[styles.presetBtn, active && styles.presetBtnActive]}
              >
                <Text
                  style={[styles.presetBtnText, active && styles.presetBtnTextActive]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.webPhoneFrame,
            isFull
              ? styles.webPhoneFrameFull
              : {
                  maxWidth: activePreset.width,
                  maxHeight: activePreset.height,
                },
          ]}
        >
          {appTree}
        </View>
      </View>
    );
  }

  return appTree;
}

const styles = StyleSheet.create({
  webViewport: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  webToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetBtnActive: {
    backgroundColor: COLORS.citizenCrimson,
    borderColor: COLORS.citizenGoldBorder,
  },
  presetBtnText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '700',
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
  },
  webPhoneFrame: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.citizenSurface,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
  },
  webPhoneFrameFull: {
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },
  root: {
    flex: 1,
    backgroundColor: COLORS.citizenCrimson,
  },
  navigatorWrap: {
    flex: 1,
    backgroundColor: COLORS.citizenSurface,
  },
  officerModalRoot: {
    flex: 1,
    backgroundColor: '#8F0A1B',
  },
  officerModalHeader: {
    height: 52,
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#8F0A1B',
    borderBottomWidth: 2,
    borderBottomColor: '#D4A017',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  officerModalTitle: {
    color: COLORS.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  officerModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
