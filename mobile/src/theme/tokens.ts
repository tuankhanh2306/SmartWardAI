/**
 * SmartWard AI Mobile — Design Tokens & Elderly-First Typography Engine
 * Synchronized directly from design-tokens.json (WCAG 2.1 AA/AAA, 3-Tier Font Scaling A/A+/A++)
 */
import rawTokens from '../../design-tokens.json';

export type FontScaleMode = 'A' | 'A+' | 'A++';

export const FONT_SCALE_LABELS: Record<FontScaleMode, string> = {
  A: 'Cỡ chuẩn (A)',
  'A+': 'Cỡ lớn (A+)',
  'A++': 'Cỡ rất lớn (A++)',
};

export const FONT_SCALE_FACTORS: Record<FontScaleMode, number> = {
  A: rawTokens.typography.accessibilityModes.A_Standard.scaleFactor,
  'A+': rawTokens.typography.accessibilityModes.A_Plus_Large.scaleFactor,
  'A++': rawTokens.typography.accessibilityModes.A_PlusPlus_Elderly.scaleFactor,
};

const light = rawTokens.color.semantic.light;

export const COLORS = {
  primary: light['color/primary/default'],
  primaryPressed: light['color/primary/pressed'],
  primarySubtle: light['color/primary/subtle'],
  primaryBorder: light['color/primary/border'],
  onPrimary: light['color/primary/on-primary'],

  canvas: light['color/surface/canvas'],
  card: light['color/surface/card'],
  elevated: light['color/surface/elevated'],
  mutedSurface: light['color/surface/muted'],
  cameraOverlay: light['color/surface/camera-overlay'],

  textPrimary: light['color/text/primary'],
  textSecondary: light['color/text/secondary'],
  textMuted: light['color/text/muted'],
  textDisabled: light['color/text/disabled'],

  borderDefault: light['color/border/default'],
  borderSubtle: light['color/border/subtle'],
  borderFocus: light['color/border/focus'],

  successText: light['color/status/success-text'],
  successBg: light['color/status/success-bg'],
  successBorder: light['color/status/success-border'],
  successAccent: rawTokens.color.primitives.success['600'],

  warningText: light['color/status/warning-text'],
  warningBg: light['color/status/warning-bg'],
  warningBorder: light['color/status/warning-border'],
  warningAccent: rawTokens.color.primitives.warning['600'],

  errorText: light['color/status/error-text'],
  errorBg: light['color/status/error-bg'],
  errorBorder: light['color/status/error-border'],
  errorAccent: rawTokens.color.primitives.error['600'],

  infoText: light['color/status/info-text'],
  infoBg: light['color/status/info-bg'],
  infoBorder: light['color/status/info-border'],

  scannerLaser: rawTokens.color.primitives.primary['400'],
} as const;

export const SPACING = {
  xs: rawTokens.spacing['space/1'],
  sm: rawTokens.spacing['space/2'],
  md: rawTokens.spacing['space/3'],
  lg: rawTokens.spacing['space/4'],
  xl: rawTokens.spacing['space/5'],
  xxl: rawTokens.spacing['space/6'],
  xxxl: rawTokens.spacing['space/8'],
} as const;

export const RADIUS = {
  xs: rawTokens.radius['radius/xs'],
  sm: rawTokens.radius['radius/sm'],
  md: rawTokens.radius['radius/md'],
  lg: rawTokens.radius['radius/lg'],
  xl: rawTokens.radius['radius/xl'],
  xxl: rawTokens.radius['radius/2xl'],
  full: rawTokens.radius['radius/full'],
} as const;

export const TOUCH_TARGETS = {
  minButtonHeight: rawTokens.touchTargets.minButtonHeight,
  minIconTapArea: rawTokens.touchTargets.minIconTapArea,
  minInputHeight: rawTokens.touchTargets.minInputHeight,
  bottomTabBarHeight: rawTokens.touchTargets.bottomTabBarHeight,
  appBarHeight: rawTokens.touchTargets.appBarHeight,
} as const;

export const MIN_TOUCH_TARGET = TOUCH_TARGETS.minButtonHeight; // 48dp

export const DOMAIN_THRESHOLDS = {
  ragDirectAnswerSimilarity: rawTokens.domainThresholds.ragDirectAnswerSimilarity, // 0.78
  ragHitlLowerSimilarity: rawTokens.domainThresholds.ragHitlLowerSimilarity, // 0.42
  visionMinSharpnessScore: rawTokens.domainThresholds.visionMinSharpnessScore, // 45
  visionMinBrightnessScore: rawTokens.domainThresholds.visionMinBrightnessScore, // 55
  gpsClusterRadiusMeters: rawTokens.domainThresholds.gpsClusterRadiusMeters, // 25.0
  semanticClusterThreshold: rawTokens.domainThresholds.semanticClusterThreshold, // 0.82
} as const;

export interface TypographyStyleToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
  fontFamily?: string;
}

export interface TypographyScaleSet {
  mode: FontScaleMode;
  scaleFactor: number;
  displayXl: TypographyStyleToken;
  headingLg: TypographyStyleToken;
  headingMd: TypographyStyleToken;
  bodyMd: TypographyStyleToken;
  bodyBold: TypographyStyleToken;
  captionSm: TypographyStyleToken;
  monoCode: TypographyStyleToken;
}

const BASE_TYPOGRAPHY = rawTokens.typography.accessibilityModes.A_Standard.styles;

function scaleToken(
  token: { fontSize: number; lineHeight: number; fontWeight: string; fontFamily?: string },
  factor: number
): TypographyStyleToken {
  return {
    fontSize: Math.round(token.fontSize * factor * 10) / 10,
    lineHeight: Math.round(token.lineHeight * factor),
    fontWeight: token.fontWeight as TypographyStyleToken['fontWeight'],
    ...(token.fontFamily ? { fontFamily: token.fontFamily } : {}),
  };
}

/**
 * Returns accessibility-calibrated typography styles scaled by:
 * - 'A'   -> 1.0x
 * - 'A+'  -> 1.15x
 * - 'A++' -> 1.32x
 */
export function getTypographyStyles(mode: FontScaleMode): TypographyScaleSet {
  const factor = FONT_SCALE_FACTORS[mode] ?? 1.0;

  return {
    mode,
    scaleFactor: factor,
    displayXl: scaleToken(BASE_TYPOGRAPHY['display/xl'], factor),
    headingLg: scaleToken(BASE_TYPOGRAPHY['heading/lg'], factor),
    headingMd: scaleToken(BASE_TYPOGRAPHY['heading/md'], factor),
    bodyMd: scaleToken(BASE_TYPOGRAPHY['body/md'], factor),
    bodyBold: scaleToken(BASE_TYPOGRAPHY['body/bold'], factor),
    captionSm: scaleToken(BASE_TYPOGRAPHY['caption/sm'], factor),
    monoCode: scaleToken(BASE_TYPOGRAPHY['mono/code'], factor),
  };
}
