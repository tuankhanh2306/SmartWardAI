import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type TextScale = 'normal' | 'large' | 'huge';

interface AccessibilityContextType {
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;
  isHighContrast: boolean;
  setIsHighContrast: (val: boolean) => void;
  isAudioAutoPlay: boolean;
  setIsAudioAutoPlay: (val: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'smartward_accessibility_pref';

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [textScale, setTextScaleState] = useState<TextScale>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_scale`);
      return (saved as TextScale) || 'normal';
    } catch {
      return 'normal';
    }
  });

  const [isHighContrast, setIsHighContrastState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_contrast`) === 'true';
    } catch {
      return false;
    }
  });

  const [isAudioAutoPlay, setIsAudioAutoPlayState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_audio`) === 'true';
    } catch {
      return false;
    }
  });

  const setTextScale = (scale: TextScale) => {
    setTextScaleState(scale);
    try {
      localStorage.setItem(`${STORAGE_KEY}_scale`, scale);
    } catch {}
  };

  const setIsHighContrast = (val: boolean) => {
    setIsHighContrastState(val);
    try {
      localStorage.setItem(`${STORAGE_KEY}_contrast`, String(val));
    } catch {}
  };

  const setIsAudioAutoPlay = (val: boolean) => {
    setIsAudioAutoPlayState(val);
    try {
      localStorage.setItem(`${STORAGE_KEY}_audio`, String(val));
    } catch {}
  };

  // Sync to root html document for global text scaling
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('scale-text-normal', 'scale-text-large', 'scale-text-huge', 'high-contrast-mode');
    root.classList.add(`scale-text-${textScale}`);
    if (isHighContrast) {
      root.classList.add('high-contrast-mode');
    }
  }, [textScale, isHighContrast]);

  return (
    <AccessibilityContext.Provider
      value={{
        textScale,
        setTextScale,
        isHighContrast,
        setIsHighContrast,
        isAudioAutoPlay,
        setIsAudioAutoPlay,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return ctx;
};
