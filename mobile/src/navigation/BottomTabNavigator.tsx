/**
 * SmartWard AI Mobile — Thanh Điều hướng 3 Chức Năng Chính (BottomTabNavigator)
 * 1. 40 TTHC           (LegalRagChatScreen)
 * 2. Báo cáo sự cố     (FieldIncidentReportScreen)
 * 3. Kiểm tra tờ khai  (SmartFormPrecheckScreen)
 * Tối ưu rộng thoáng cho mọi kích cỡ điện thoại (320px -> 430px+) & SafeArea.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  BookOpen,
  FileCheck2,
  MapPin,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccessibility } from '../context/AccessibilityContext';
import { FieldIncidentReportScreen } from '../screens/FieldIncidentReportScreen';
import { LegalRagChatScreen } from '../screens/LegalRagChatScreen';
import { SmartFormPrecheckScreen } from '../screens/SmartFormPrecheckScreen';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, TOUCH_TARGETS } from '../theme/tokens';
import type { CoreFormType } from '../types/api.types';

export type RootTabParamList = {
  LegalRagTab: undefined;
  IncidentTab: undefined;
  SmartFormTab: { initialFormType?: CoreFormType } | undefined;
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
          fontSize: responsive.isTinyPhone ? 11 : 12,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="LegalRagTab"
        component={LegalRagChatScreen}
        options={{
          title: '40 TTHC',
          tabBarIcon: ({ color }) => <BookOpen size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="IncidentTab"
        component={FieldIncidentReportScreen}
        options={{
          title: 'Báo cáo sự cố',
          tabBarIcon: ({ color }) => <MapPin size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="SmartFormTab"
        component={SmartFormPrecheckScreen}
        options={{
          title: 'Kiểm tra tờ khai',
          tabBarIcon: ({ color }) => <FileCheck2 size={21} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
