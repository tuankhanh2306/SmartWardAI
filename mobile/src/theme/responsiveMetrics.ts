/**
 * SmartWard AI Mobile — Pure Responsive Breakpoints & Office Schedule Logic
 * Zero React Native runtime dependency so it can be cleanly unit-tested in Node/Vitest.
 */

import type { FontScaleMode } from './tokens';

export type PhoneSizeClass = 'tiny' | 'compact' | 'standard' | 'large';

export interface ResponsiveMetrics {
  width: number;
  height: number;
  sizeClass: PhoneSizeClass;
  isTinyPhone: boolean;
  isCompactPhone: boolean;
  isStandardPhone: boolean;
  isLargePhone: boolean;
  isShortScreen: boolean;
  isLandscape: boolean;
  horizontalPadding: number;
  cardPadding: number;
  sectionGap: number;
  /** 1 column on tiny phones or A++ elderly mode; 2 columns on compact/standard/large phones */
  bentoColumns: 1 | 2;
  /** Maximum readable content width on foldables/tablets */
  maxContentWidth: number;
  /** Tab bar label sizing adapted so all 5 tabs never wrap or clip */
  tabLabelFontSize: number;
  tabIconSize: number;
  showHeaderSubtitle: boolean;
  showCompactFontLabel: boolean;
}

export function computeResponsiveMetrics(
  width: number,
  height: number,
  fontScaleMode: FontScaleMode = 'A'
): ResponsiveMetrics {
  const safeWidth = Math.max(280, Math.round(width || 390));
  const safeHeight = Math.max(480, Math.round(height || 844));

  const sizeClass: PhoneSizeClass =
    safeWidth < 350
      ? 'tiny'
      : safeWidth < 380
      ? 'compact'
      : safeWidth < 425
      ? 'standard'
      : 'large';

  const isTinyPhone = sizeClass === 'tiny';
  const isCompactPhone = sizeClass === 'compact';
  const isStandardPhone = sizeClass === 'standard';
  const isLargePhone = sizeClass === 'large';
  const isShortScreen = safeHeight < 700;
  const isLandscape = safeWidth > safeHeight;

  const horizontalPadding = isTinyPhone ? 10 : isCompactPhone ? 12 : isLargePhone ? 18 : 14;
  const cardPadding = isTinyPhone ? 12 : isCompactPhone ? 14 : 16;
  const sectionGap = isTinyPhone ? 10 : isCompactPhone ? 12 : 14;

  const bentoColumns: 1 | 2 = isTinyPhone || fontScaleMode === 'A++' ? 1 : 2;
  const tabLabelFontSize = isTinyPhone ? 9.5 : isCompactPhone ? 10.5 : 11;
  const tabIconSize = isTinyPhone ? 19 : 21;

  return {
    width: safeWidth,
    height: safeHeight,
    sizeClass,
    isTinyPhone,
    isCompactPhone,
    isStandardPhone,
    isLargePhone,
    isShortScreen,
    isLandscape,
    horizontalPadding,
    cardPadding,
    sectionGap,
    bentoColumns,
    maxContentWidth: 640,
    tabLabelFontSize,
    tabIconSize,
    showHeaderSubtitle: safeWidth >= 355 && fontScaleMode !== 'A++',
    showCompactFontLabel: safeWidth < 385,
  };
}

/**
 * Checks real-time Vietnamese UBND office working hours:
 * Monday–Friday, 07:00–11:00 and 13:00–17:00 (matches Web WardContext).
 */
export function getOfficeOpenStatus(now: Date = new Date()): {
  isOfficeOpen: boolean;
  statusLabel: string;
} {
  const day = now.getDay(); // 0 = Sun, 6 = Sat
  const hour = now.getHours();
  const isWeekday = day >= 1 && day <= 5;
  const isWorkingHour = (hour >= 7 && hour < 11) || (hour >= 13 && hour < 17);
  const isOfficeOpen = isWeekday && isWorkingHour;

  return {
    isOfficeOpen,
    statusLabel: isOfficeOpen ? 'Đang tiếp dân' : 'Ngoài giờ • AI 24/7',
  };
}
