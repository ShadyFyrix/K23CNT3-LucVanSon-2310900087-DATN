import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentTheme = 'sapphire' | 'emerald' | 'violet' | 'amber' | 'rose';

export interface AccentThemeOption {
  id: AccentTheme;
  name: string;
  primary: string;
  royal: string;
  azure: string;
  colorSwatch: string;
}

export const ACCENT_THEMES: AccentThemeOption[] = [
  {
    id: 'sapphire',
    name: 'Electric Sapphire (Chuẩn)',
    primary: '#1951fc',
    royal: '#0b2cb1',
    azure: '#3781fc',
    colorSwatch: '#1951fc'
  },
  {
    id: 'emerald',
    name: 'Cyber Emerald (Giám Thị)',
    primary: '#10b981',
    royal: '#059669',
    azure: '#14b8a6',
    colorSwatch: '#10b981'
  },
  {
    id: 'violet',
    name: 'Neon Violet (Cyberpunk)',
    primary: '#8b5cf6',
    royal: '#7c3aed',
    azure: '#a855f7',
    colorSwatch: '#8b5cf6'
  },
  {
    id: 'amber',
    name: 'Solar Amber (Năng Lượng)',
    primary: '#f59e0b',
    royal: '#d97706',
    azure: '#fbbf24',
    colorSwatch: '#f59e0b'
  },
  {
    id: 'rose',
    name: 'Crimson Rose (Ruby)',
    primary: '#f43f5e',
    royal: '#e11d48',
    azure: '#fb7185',
    colorSwatch: '#f43f5e'
  }
];

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  accentTheme: AccentTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setAccentTheme: (accent: AccentTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'examguard_theme_mode';
const ACCENT_STORAGE_KEY = 'examguard_accent_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'dark'; // Mặc định dark mode cho phòng thi an ninh & chống chói
  });

  const [accentTheme, setAccentThemeState] = useState<AccentTheme>(() => {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (saved && ['sapphire', 'emerald', 'violet', 'amber', 'rose'].includes(saved)) {
      return saved as AccentTheme;
    }
    return 'sapphire';
  });

  const [isDark, setIsDark] = useState<boolean>(true);

  // Áp dụng Accent Color tokens vào DOM Root
  useEffect(() => {
    const root = document.documentElement;
    const selected = ACCENT_THEMES.find(t => t.id === accentTheme) || ACCENT_THEMES[0];

    root.setAttribute('data-accent-theme', accentTheme);
    root.style.setProperty('--color-electric', selected.primary);
    root.style.setProperty('--color-royal', selected.royal);
    root.style.setProperty('--color-azure', selected.azure);
    root.style.setProperty('--color-brand-primary', selected.primary);

    // Dynamic RGB conversions for transparent glowing backgrounds
    const hexToRgb = (hex: string) => {
      const sanitized = hex.replace('#', '');
      const r = parseInt(sanitized.substring(0, 2), 16) || 25;
      const g = parseInt(sanitized.substring(2, 4), 16) || 81;
      const b = parseInt(sanitized.substring(4, 6), 16) || 252;
      return `${r}, ${g}, ${b}`;
    };

    root.style.setProperty('--color-electric-rgb', hexToRgb(selected.primary));
    root.style.setProperty('--color-royal-rgb', hexToRgb(selected.royal));
    root.style.setProperty('--color-azure-rgb', hexToRgb(selected.azure));
    localStorage.setItem(ACCENT_STORAGE_KEY, accentTheme);
  }, [accentTheme]);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      let darkActive = false;
      if (theme === 'system') {
        darkActive = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        darkActive = theme === 'dark';
      }

      setIsDark(darkActive);
      if (darkActive) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme();
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        if (e.matches) {
          root.classList.add('dark');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.remove('dark');
          root.style.colorScheme = 'light';
        }
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setAccentTheme = (newAccent: AccentTheme) => {
    setAccentThemeState(newAccent);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, accentTheme, setTheme, toggleTheme, setAccentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme phải được sử dụng bên trong ThemeProvider');
  }
  return context;
};
