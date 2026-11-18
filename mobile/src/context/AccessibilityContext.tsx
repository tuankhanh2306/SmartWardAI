/**
 * SmartWard AI Mobile — AccessibilityContext
 * Quản lý Cỡ chữ 3 cấp cho Người cao tuổi (A = 1.0x | A+ = 1.15x | A++ = 1.32x)
 * và trạng thái Giọng đọc Tiếng Việt TTS toàn cục (expo-speech).
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import {
  FONT_SCALE_LABELS,
  getTypographyStyles,
  type FontScaleMode,
  type TypographyScaleSet,
} from '../theme/tokens';

const STORAGE_FONT_MODE_KEY = 'smartward_font_scale_mode_v1';
const FONT_MODE_ORDER: FontScaleMode[] = ['A', 'A+', 'A++'];

export interface AccessibilityContextValue {
  fontScaleMode: FontScaleMode;
  fontScaleLabel: string;
  typography: TypographyScaleSet;
  setFontScaleMode: (mode: FontScaleMode) => Promise<void>;
  cycleFontMode: () => Promise<void>;
  isSpeaking: boolean;
  speakingId: string | null;
  speakVietnamese: (text: string, itemId?: string) => void;
  stopSpeaking: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

function sanitizeTextForSpeech(raw: string): string {
  return raw
    .replace(/[#*_`>~]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontScaleMode, setFontScaleModeState] = useState<FontScaleMode>('A');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_FONT_MODE_KEY);
        if (mounted && (saved === 'A' || saved === 'A+' || saved === 'A++')) {
          setFontScaleModeState(saved);
        }
      } catch {
        // Use default 'A'
      }
    })();

    return () => {
      mounted = false;
      try {
        Speech.stop();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const setFontScaleMode = useCallback(async (mode: FontScaleMode) => {
    setFontScaleModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_FONT_MODE_KEY, mode);
    } catch {
      // Ignore
    }
  }, []);

  const cycleFontMode = useCallback(async () => {
    const idx = FONT_MODE_ORDER.indexOf(fontScaleMode);
    const nextMode = FONT_MODE_ORDER[(idx + 1) % FONT_MODE_ORDER.length];
    await setFontScaleMode(nextMode);
  }, [fontScaleMode, setFontScaleMode]);

  const stopSpeaking = useCallback(() => {
    try {
      Speech.stop();
    } catch {
      // Ignore
    }
    setIsSpeaking(false);
    setSpeakingId(null);
  }, []);

  const speakVietnamese = useCallback(
    (text: string, itemId?: string) => {
      const clean = sanitizeTextForSpeech(text);
      if (!clean) return;

      stopSpeaking();
      setIsSpeaking(true);
      setSpeakingId(itemId ?? 'global');

      try {
        Speech.speak(clean, {
          language: 'vi-VN',
          rate: 0.95,
          pitch: 1.0,
          onDone: () => {
            setIsSpeaking(false);
            setSpeakingId(null);
          },
          onStopped: () => {
            setIsSpeaking(false);
            setSpeakingId(null);
          },
          onError: () => {
            setIsSpeaking(false);
            setSpeakingId(null);
          },
        });
      } catch {
        setIsSpeaking(false);
        setSpeakingId(null);
      }
    },
    [stopSpeaking]
  );

  const typography = useMemo(() => getTypographyStyles(fontScaleMode), [fontScaleMode]);

  return (
    <AccessibilityContext.Provider
      value={{
        fontScaleMode,
        fontScaleLabel: FONT_SCALE_LABELS[fontScaleMode],
        typography,
        setFontScaleMode,
        cycleFontMode,
        isSpeaking,
        speakingId,
        speakVietnamese,
        stopSpeaking,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used inside AccessibilityProvider');
  }
  return ctx;
}
