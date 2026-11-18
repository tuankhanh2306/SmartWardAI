/**
 * SmartWard AI Mobile — Thanh Điều hướng 5 Tab Đáy (BottomTabNavigator)
 * Đồng bộ bảng màu Web Frontend (#B90E23 Citizen Crimson / #0F2942 Officer Navy)
 * Tối ưu SafeArea (iPhone Home Indicator / Android Nav Bar) & mọi kích cỡ điện thoại (320px -> 430px+)
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccessibility } from '../context/AccessibilityContext';
import { DossierAndQrPassScreen } from '../screens/DossierAndQrPassScreen';
import { FieldIncidentReportScreen } from '../screens/FieldIncidentReportScreen';
import { LegalRagChatScreen } from '../screens/LegalRagChatScreen';
import { OfficerMobileAuditScreen } from '../screens/OfficerMobileAuditScreen';
import { SmartFormPrecheckScreen } from '../screens/SmartFormPrecheckScreen';
import { useResponsivePhone } from '../theme/responsive';
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
  const { stopSpeaking, fontScaleMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, 6);

  return (
    <Tab.Navigator
      initialRouteName="LegalRagTab"
      screenListeners={{
        tabPress: () => {
          stopSpeaking();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.citizenCrimson,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          height: TOUCH_TARGETS.bottomTabBarHeight + Math.max(0, insets.bottom - 4),
          backgroundColor: COLORS.card,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderSubtle,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: responsive.tabLabelFontSize,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="LegalRagTab"
        component={LegalRagChatScreen}
        options={{
          title: '40 TTHC',
          tabBarIcon: ({ color }) => (
            <MessageSquareText size={responsive.tabIconSize} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SmartFormTab"
        component={SmartFormPrecheckScreen}
        options={{
          title: 'Sơ Duyệt',
          tabBarIcon: ({ color }) => (
            <ShieldCheck size={responsive.tabIconSize} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="QrWalletTab"
        component={DossierAndQrPassScreen}
        options={{
          title: 'Ví Mã QR',
          tabBarIcon: ({ color }) => (
            <QrCode size={responsive.tabIconSize} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="IncidentTab"
        component={FieldIncidentReportScreen}
        options={{
          title: responsive.isTinyPhone ? 'Sự Cố' : 'Sự Cố 25m',
          tabBarIcon: ({ color }) => (
            <MapPinned size={responsive.tabIconSize} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OfficerTab"
        component={OfficerMobileAuditScreen}
        options={{
          title: 'Cán Bộ',
          tabBarActiveTintColor: COLORS.officerNavy,
          tabBarIcon: ({ color }) => (
            <Landmark size={responsive.tabIconSize} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
