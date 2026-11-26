import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AN_GIANG_WARDS, DEFAULT_WARD, type WardItem } from '../data/anGiangWards';
import { fetchWardsFromBackend, loadCachedWards } from '../api/modules/ward.api';

// Requirement 7: 'AG_PROVINCE' of admin is never treated as a commune/ward
export const VALID_COMMUNE_WARDS: WardItem[] = AN_GIANG_WARDS.filter(
  (w) => w.code !== 'AG_PROVINCE'
);

export const isCommuneWardCode = (code?: string | null): boolean => {
  if (!code) return false;
  const clean = code.trim().toUpperCase();
  if (clean === 'AG_PROVINCE') return false;
  return VALID_COMMUNE_WARDS.some((w) => w.code.toUpperCase() === clean);
};

interface WardContextType {
  currentWard: WardItem;
  setWard: (ward: WardItem) => void;
  allWards: WardItem[];
  totalWardsCount: number;
  searchWards: (keyword: string, filterType?: 'ALL' | 'Phường' | 'Xã' | 'Thị trấn' | 'Đặc khu') => WardItem[];
  isOfficeOpen: boolean;
  officeStatusLabel: string;
}

const WARD_STORAGE_KEY = 'smartward_selected_ward_code';

const WardContext = createContext<WardContextType | undefined>(undefined);

export const WardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [allWards, setAllWards] = useState<WardItem[]>(() => loadCachedWards() || VALID_COMMUNE_WARDS);
  const [currentWard, setCurrentWardState] = useState<WardItem>(() => {
    const initialList = loadCachedWards() || VALID_COMMUNE_WARDS;
    const savedCode = localStorage.getItem(WARD_STORAGE_KEY);
    if (savedCode && savedCode !== 'AG_PROVINCE') {
      const found = initialList.find((w) => w.code === savedCode);
      if (found) return found;
    }
    return initialList.find((w) => w.code === DEFAULT_WARD.code) || DEFAULT_WARD;
  });

  // TASK-024: Background sync wards catalog from Backend GET /api/v1/wards with offline fallback
  useEffect(() => {
    let active = true;
    void fetchWardsFromBackend().then((remoteWards) => {
      if (!active || !remoteWards || remoteWards.length === 0) return;
      setAllWards(remoteWards);
      setCurrentWardState((prev) => remoteWards.find((w) => w.code === prev.code) || prev);
    });
    return () => {
      active = false;
    };
  }, []);

  const [isOfficeOpen, setIsOfficeOpen] = useState(false);
  const [officeStatusLabel, setOfficeStatusLabel] = useState('Đang kiểm tra giờ hành chính...');

  // Calculate if the government office is currently open (Vietnam Working Hours: 7-11h & 13-17h, Mon-Fri)
  useEffect(() => {
    const checkOfficeHours = () => {
      const now = new Date();
      const day = now.getDay(); // 0 is Sunday, 6 is Saturday
      const hour = now.getHours();
      const minute = now.getMinutes();
      const timeInMinutes = hour * 60 + minute;
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = dayNames[day];

      // Monday to Friday
      if (day >= 1 && day <= 5) {
        const morningOpen = 7 * 60; // 07:00
        const morningClose = 11 * 60 + 30; // 11:30
        const afternoonOpen = 13 * 60; // 13:00
        const afternoonClose = 17 * 60; // 17:00

        if (timeInMinutes >= morningOpen && timeInMinutes <= morningClose) {
          setIsOfficeOpen(true);
          setOfficeStatusLabel(`Đang mở cửa tiếp dân (Ca sáng ${dayName})`);
        } else if (timeInMinutes >= afternoonOpen && timeInMinutes <= afternoonClose) {
          setIsOfficeOpen(true);
          setOfficeStatusLabel(`Đang mở cửa tiếp dân (Ca chiều ${dayName})`);
        } else if (timeInMinutes > morningClose && timeInMinutes < afternoonOpen) {
          setIsOfficeOpen(false);
          setOfficeStatusLabel(`Đang nghỉ trưa (${dayName} • Mở lại 13:00)`);
        } else {
          setIsOfficeOpen(false);
          setOfficeStatusLabel(`Ngoài giờ hành chính (${dayName} • AI trực 24/7)`);
        }
      } else {
        // Saturday / Sunday closed
        setIsOfficeOpen(false);
        setOfficeStatusLabel(`Nghỉ cuối tuần (${dayName} • Tư vấn AI 24/7)`);
      }
    };

    checkOfficeHours();
    const timer = setInterval(checkOfficeHours, 30000);
    return () => clearInterval(timer);
  }, []);

  const setWard = (ward: WardItem) => {
    if (!ward || ward.code === 'AG_PROVINCE') return;
    setCurrentWardState(ward);
    localStorage.setItem(WARD_STORAGE_KEY, ward.code);
  };

  return (
    <WardContext.Provider
      value={{
        currentWard,
        setWard,
        allWards,
        totalWardsCount: allWards.length,
        searchWards: (kw, filterType = 'ALL') => {
          const clean = kw.trim().toLowerCase();
          return allWards.filter((w) => {
            if (w.code === 'AG_PROVINCE') return false;
            if (filterType !== 'ALL' && w.type !== filterType) return false;
            if (!clean) return true;
            return (
              w.name.toLowerCase().includes(clean) ||
              w.code.toLowerCase().includes(clean) ||
              (w.area || '').toLowerCase().includes(clean) ||
              (w.officeAddress || '').toLowerCase().includes(clean)
            );
          });
        },
        isOfficeOpen,
        officeStatusLabel,
      }}
    >
      {children}
    </WardContext.Provider>
  );
};

export const useWard = (): WardContextType => {
  const context = useContext(WardContext);
  if (!context) {
    throw new Error('useWard must be used within a WardProvider');
  }
  return context;
};
