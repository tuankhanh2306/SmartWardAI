/**
 * SmartWard AI Mobile — Thanh Điều hướng 5 Tab Đáy (BottomTabNavigator)
 * Chiều cao chuẩn: 64dp | Active: #00796B | Inactive: #64748B
 * 5 Tab:
 *  1. 💬 40 TTHC    (LegalRagChatScreen)
 *  2. 🛡️ Sơ Duyệt   (SmartFormPrecheckScreen)
 *  3. 🎫 Ví Mã QR   (DossierAndQrPassScreen)
 *  4. 📍 Sự Cố 25m  (FieldIncidentReportScreen)
 *  5. 🏛️ Cán Bộ     (OfficerMobileAuditScreen)
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Landmark,
  MapPinned,
  MessageSquareText,
  QrCode,
  ShieldCheck,
} from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { DossierAndQrPassScreen } from '../screens/DossierAndQrPassScreen';
import { FieldIncidentReportScreen } from '../screens/FieldIncidentReportScreen';
import { LegalRagChatScreen } from '../screens/LegalRagChatScreen';
import { OfficerMobileAuditScreen } from '../screens/OfficerMobileAuditScreen';
import { SmartFormPrecheckScreen } from '../screens/SmartFormPrecheckScreen';
import { COLORS, TOUCH_TARGETS } from '../theme/tokens';
import type { CoreFormType } from '../types/api.types';

export type RootTabParamList = {
  LegalRagTab: undefined;
  SmartFormTab: { initialFormType?: CoreFormType } | undefined;
  QrWalletTab: { highlightDossierCode?: string } | undefined;
  IncidentTab: undefined;
  OfficerTab: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { stopSpeaking } = useAccessibility();

  return (
    <Tab.Navigator
      initialRouteName="LegalRagTab"
      screenListeners={{
        tabPress: () => {
          // Stop any active TTS reading when switching tabs
          stopSpeaking();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          height: TOUCH_TARGETS.bottomTabBarHeight,
          backgroundColor: COLORS.card,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderSubtle,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="LegalRagTab"
        component={LegalRagChatScreen}
        options={{
          title: '40 TTHC',
          tabBarIcon: ({ color, size }) => <MessageSquareText size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="SmartFormTab"
        component={SmartFormPrecheckScreen}
        options={{
          title: 'Sơ Duyệt',
          tabBarIcon: ({ color, size }) => <ShieldCheck size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="QrWalletTab"
        component={DossierAndQrPassScreen}
        options={{
          title: 'Ví Mã QR',
          tabBarIcon: ({ color, size }) => <QrCode size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="IncidentTab"
        component={FieldIncidentReportScreen}
        options={{
          title: 'Sự Cố 25m',
          tabBarIcon: ({ color, size }) => <MapPinned size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OfficerTab"
        component={OfficerMobileAuditScreen}
        options={{
          title: 'Cán Bộ',
          tabBarIcon: ({ color, size }) => <Landmark size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
