import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
  isSystemPreference: false
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch (e) {
      console.error('[ThemeContext] LocalStorage access error:', e);
    }
    return 'light';
  });

  const [isSystemPreference, setIsSystemPreference] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const root = window.document.documentElement;
      if (isMounted) {
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
      }
    } catch (error) {
      console.error('[ThemeContext] Error applying theme:', error);
    }
    return () => { isMounted = false; };
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let isMounted = true;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (!isMounted) return;
      try {
        if (!localStorage.getItem('theme')) {
          setTheme(e.matches ? 'dark' : 'light');
          setIsSystemPreference(true);
        }
      } catch (err) {
        console.error('[ThemeContext] Media Query Handle Error:', err);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      isMounted = false;
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;
    const handleStorageChange = (e) => {
      if (!isMounted) return;
      if (e.key === 'theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      setIsSystemPreference(false);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isSystemPreference }}>
      {children}
    </ThemeContext.Provider>
  );
};