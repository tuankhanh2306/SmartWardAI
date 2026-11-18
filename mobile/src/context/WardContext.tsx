/**
 * SmartWard AI Mobile — WardContext
 * Quản lý đơn vị hành chính đang chọn trong 96 Xã/Phường/Đặc khu tỉnh An Giang.
 * Mặc định: AG_P_LONGXUYEN (Phường Long Xuyên).
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  AN_GIANG_WARDS,
  DEFAULT_WARD,
  findNearestWardByGps,
  getWardByCode,
  type WardItem,
} from '../core/angiangWards';
import { setActiveWardHeader } from '../api/client';

const STORAGE_WARD_CODE_KEY = 'smartward_selected_ward_code_v1';
const STORAGE_ONBOARDING_DONE_KEY = 'smartward_onboarding_completed_v1';

export interface WardContextValue {
  currentWard: WardItem;
  allWards: WardItem[];
  hasCompletedOnboarding: boolean;
  isDetectingGps: boolean;
  gpsError: string | null;
  selectWard: (wardOrCode: WardItem | string, markOnboardingDone?: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  detectNearestWardByGps: () => Promise<{ ward: WardItem; distanceMeters: number } | null>;
}

const WardContext = createContext<WardContextValue | undefined>(undefined);

export const WardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentWard, setCurrentWard] = useState<WardItem>(DEFAULT_WARD);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedCode, savedOnboard] = await Promise.all([
          AsyncStorage.getItem(STORAGE_WARD_CODE_KEY),
          AsyncStorage.getItem(STORAGE_ONBOARDING_DONE_KEY),
        ]);
        if (!mounted) return;

        if (savedCode) {
          const found = getWardByCode(savedCode);
          if (found) {
            setCurrentWard(found);
            setActiveWardHeader(found.code);
          }
        } else {
          setActiveWardHeader(DEFAULT_WARD.code);
        }

        if (savedOnboard === 'true') {
          setHasCompletedOnboarding(true);
        }
      } catch {
        setActiveWardHeader(DEFAULT_WARD.code);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const selectWard = useCallback(
    async (wardOrCode: WardItem | string, markOnboardingDone = false) => {
      const target =
        typeof wardOrCode === 'string' ? getWardByCode(wardOrCode) || DEFAULT_WARD : wardOrCode;

      setCurrentWard(target);
      setActiveWardHeader(target.code);
      setGpsError(null);

      try {
        await AsyncStorage.setItem(STORAGE_WARD_CODE_KEY, target.code);
        if (markOnboardingDone) {
          setHasCompletedOnboarding(true);
          await AsyncStorage.setItem(STORAGE_ONBOARDING_DONE_KEY, 'true');
        }
      } catch {
        // Ignore persistence failure on restricted storage
      }
    },
    []
  );

  const completeOnboarding = useCallback(async () => {
    setHasCompletedOnboarding(true);
    try {
      await AsyncStorage.setItem(STORAGE_ONBOARDING_DONE_KEY, 'true');
    } catch {
      // Ignore
    }
  }, []);

  const detectNearestWardByGps = useCallback(async () => {
    setIsDetectingGps(true);
    setGpsError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setGpsError('Chưa được cấp quyền vị trí GPS. Vui lòng chọn Xã/Phường thủ công bên dưới.');
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nearest = findNearestWardByGps(pos.coords.latitude, pos.coords.longitude);
      await selectWard(nearest.ward, false);
      return nearest;
    } catch {
      setGpsError('Không thể lấy tọa độ GPS lúc này. Vui lòng chọn Xã/Phường từ danh sách.');
      return null;
    } finally {
      setIsDetectingGps(false);
    }
  }, [selectWard]);

  return (
    <WardContext.Provider
      value={{
        currentWard,
        allWards: AN_GIANG_WARDS,
        hasCompletedOnboarding,
        isDetectingGps,
        gpsError,
        selectWard,
        completeOnboarding,
        detectNearestWardByGps,
      }}
    >
      {children}
    </WardContext.Provider>
  );
};

export function useWard(): WardContextValue {
  const ctx = useContext(WardContext);
  if (!ctx) {
    throw new Error('useWard must be used inside WardProvider');
  }
  return ctx;
}
