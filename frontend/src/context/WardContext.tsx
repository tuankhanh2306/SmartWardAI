import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AN_GIANG_WARDS, DEFAULT_WARD, searchAnGiangWards, type WardItem } from '../data/anGiangWards';

interface WardContextType {
  currentWard: WardItem;
  setWard: (ward: WardItem) => void;
  allWards: WardItem[];
  searchWards: (keyword: string, filterType?: 'ALL' | 'Phường' | 'Xã' | 'Thị trấn') => WardItem[];
  isOfficeOpen: boolean;
}

const WARD_STORAGE_KEY = 'smartward_selected_ward_code';

const WardContext = createContext<WardContextType | undefined>(undefined);

export const WardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentWard, setCurrentWardState] = useState<WardItem>(() => {
    const savedCode = localStorage.getItem(WARD_STORAGE_KEY);
    if (savedCode) {
      const found = AN_GIANG_WARDS.find((w) => w.code === savedCode);
      if (found) return found;
    }
    return DEFAULT_WARD;
  });

  const [isOfficeOpen, setIsOfficeOpen] = useState(true);

  // Calculate if the government office is currently open (Vietnam Working Hours: 7-11h & 13-17h, Mon-Fri)
  useEffect(() => {
    const checkOfficeHours = () => {
      const now = new Date();
      const day = now.getDay(); // 0 is Sunday, 6 is Saturday
      const hour = now.getHours();
      const minute = now.getMinutes();
      const timeInMinutes = hour * 60 + minute;

      // Monday to Friday
      if (day >= 1 && day <= 5) {
        const morningOpen = 7 * 60; // 07:00
        const morningClose = 11 * 60; // 11:00
        const afternoonOpen = 13 * 60; // 13:00
        const afternoonClose = 17 * 60; // 17:00

        const isOpen =
          (timeInMinutes >= morningOpen && timeInMinutes <= morningClose) ||
          (timeInMinutes >= afternoonOpen && timeInMinutes <= afternoonClose);
        setIsOfficeOpen(isOpen);
      } else {
        // Saturday / Sunday closed
        setIsOfficeOpen(false);
      }
    };

    checkOfficeHours();
    const timer = setInterval(checkOfficeHours, 60000);
    return () => clearInterval(timer);
  }, []);

  const setWard = (ward: WardItem) => {
    setCurrentWardState(ward);
    localStorage.setItem(WARD_STORAGE_KEY, ward.code);
  };

  return (
    <WardContext.Provider
      value={{
        currentWard,
        setWard,
        allWards: AN_GIANG_WARDS,
        searchWards: searchAnGiangWards,
        isOfficeOpen,
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
