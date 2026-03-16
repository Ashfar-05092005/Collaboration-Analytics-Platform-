import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

const MenuContext = createContext(null);
const STORAGE_KEY = 'cap.menuDesktopOpen';

const readStoredDesktopOpen = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return true;
    }
    return raw === 'true';
  } catch {
    return true;
  }
};

export function MenuProvider({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [desktopOpen, setDesktopOpen] = useState(readStoredDesktopOpen);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      try {
        localStorage.setItem(STORAGE_KEY, String(desktopOpen));
      } catch {
        // Ignore storage errors (private mode, disabled storage).
      }
    }
  }, [desktopOpen, isMobile]);

  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  const toggleMenu = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
      return;
    }
    setDesktopOpen((prev) => !prev);
  };

  const closeMobileMenu = () => setMobileOpen(false);

  const value = useMemo(
    () => ({
      isMobile,
      isDesktopOpen: desktopOpen,
      isMobileOpen: mobileOpen,
      toggleMenu,
      closeMobileMenu,
    }),
    [isMobile, desktopOpen, mobileOpen]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within MenuProvider');
  }
  return context;
}

