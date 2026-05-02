import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AccessibilityContext = createContext(null);

const CVD_MODES   = ['none', 'rg', 'tritan'];
const FONT_SIZES  = ['small', 'medium', 'large', 'xl'];
const THEME_MODES = ['system', 'light', 'dark'];

function getInitialPrefs() {
  const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const stored = JSON.parse(localStorage.getItem('aion-accessibility-prefs'));
    if (stored && typeof stored === 'object') return {
      highContrast:  Boolean(stored.highContrast),
      colorVision:   CVD_MODES.includes(stored.colorVision)   ? stored.colorVision   : 'none',
      reducedMotion: Boolean(stored.reducedMotion) || systemReduced,
      fontSize:      FONT_SIZES.includes(stored.fontSize)     ? stored.fontSize      : 'medium',
      theme:         THEME_MODES.includes(stored.theme)       ? stored.theme         : 'system',
    };
  } catch { }
  return { highContrast: false, colorVision: 'none', reducedMotion: systemReduced, fontSize: 'medium', theme: 'system' };
}

function resolveIsDark(theme) {
  if (theme === 'dark')  return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const AccessibilityProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(getInitialPrefs);

  useEffect(() => {
    const html = document.documentElement;

    html.classList.toggle('high-contrast',  preferences.highContrast);
    html.classList.toggle('cvd-rg',         preferences.colorVision === 'rg');
    html.classList.toggle('cvd-tritan',     preferences.colorVision === 'tritan');
    html.classList.toggle('reduced-motion', preferences.reducedMotion);
    html.classList.toggle('font-size-s',    preferences.fontSize === 'small');
    html.classList.toggle('font-size-l',    preferences.fontSize === 'large');
    html.classList.toggle('font-size-xl',   preferences.fontSize === 'xl');
    html.classList.toggle('dark',           resolveIsDark(preferences.theme));

    try {
      localStorage.setItem('aion-accessibility-prefs', JSON.stringify(preferences));
    } catch {}
  }, [preferences]);

  /* React to system theme changes when mode is 'system' */
  useEffect(() => {
    if (preferences.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => document.documentElement.classList.toggle('dark', e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preferences.theme]);

  const setPreference = useCallback((key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <AccessibilityContext.Provider value={{ preferences, setPreference }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
};
