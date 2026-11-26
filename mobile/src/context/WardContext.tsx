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
import { fetchWardsCatalog, setActiveWardHeader } from '../api/client';

const STORAGE_WARD_CODE_KEY = 'smartward_selected_ward_code_v1';
const STORAGE_ONBOARDING_DONE_KEY = 'smartward_onboarding_completed_v1';
const STORAGE_WARDS_CACHE_KEY = 'smartward_wards_catalog_cache_v1';

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
  const [allWards, setAllWards] = useState<WardItem[]>(AN_GIANG_WARDS);
  const [currentWard, setCurrentWard] = useState<WardItem>(DEFAULT_WARD);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedCode, savedOnboard, cachedWardsRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_WARD_CODE_KEY),
          AsyncStorage.getItem(STORAGE_ONBOARDING_DONE_KEY),
          AsyncStorage.getItem(STORAGE_WARDS_CACHE_KEY),
        ]);
        if (!mounted) return;

        let activeList: WardItem[] = AN_GIANG_WARDS;
        if (cachedWardsRaw) {
          try {
            const parsed = JSON.parse(cachedWardsRaw) as WardItem[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              activeList = parsed;
              setAllWards(parsed);
            }
          } catch {
            // Keep bundled catalog
          }
        }

        if (savedCode) {
          const found = activeList.find((w) => w.code === savedCode) || getWardByCode(savedCode);
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

        // TASK-024: Background refresh from Backend GET /api/v1/wards
        try {
          const remote = await fetchWardsCatalog({ includeBoundary: true });
          if (mounted && remote?.wards && remote.wards.length > 0) {
            const normalized: WardItem[] = remote.wards
              .filter((w) => w && w.code && w.code !== 'AG_PROVINCE')
              .map((w) => ({
                code: w.code,
                name: w.name,
                type: w.type,
                area: w.area || w.province || 'Tỉnh An Giang',
                province: w.province || 'Tỉnh An Giang',
                officeAddress: w.officeAddress,
                phoneNumber: w.phoneNumber || '(0296) 3855 100',
                lat: w.lat,
                lon: w.lon,
                workingHours:
                  w.workingHours || 'Sáng: 07:00 – 11:00 | Chiều: 13:00 – 17:00 (Thứ 2 – Thứ 6)',
                onlineServices: Array.isArray(w.onlineServices) ? w.onlineServices : [],
                totalOpenIncidents: 0,
                solvedRate: 97.5,
                boundary: w.boundary,
                coordSource: w.coordSource,
                accuracyNote: w.accuracyNote,
              }));
            if (normalized.length > 0) {
              setAllWards(normalized);
              await AsyncStorage.setItem(STORAGE_WARDS_CACHE_KEY, JSON.stringify(normalized));
            }
          }
        } catch {
          // Offline-first: keep cached or bundled catalog without surfacing errors
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
        allWards,
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
