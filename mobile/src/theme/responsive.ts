/**
 * SmartWard AI Mobile — React Native Responsive Hook
 */

import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  computeResponsiveMetrics,
  getOfficeOpenStatus,
  type PhoneSizeClass,
  type ResponsiveMetrics,
} from './responsiveMetrics';
import type { FontScaleMode } from './tokens';

export {
  computeResponsiveMetrics,
  getOfficeOpenStatus,
  type PhoneSizeClass,
  type ResponsiveMetrics,
};

export function useResponsivePhone(fontScaleMode: FontScaleMode = 'A'): ResponsiveMetrics {
  const { width, height } = useWindowDimensions();
  return useMemo(
    () => computeResponsiveMetrics(width, height, fontScaleMode),
    [width, height, fontScaleMode]
  );
}
