export type ThemeMode = 'light' | 'dark';

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('habitbot_theme') as ThemeMode;
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light'; // Default to white theme
}

export function setThemeMode(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('habitbot_theme', theme);
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
  window.dispatchEvent(new Event('habitbot_theme_changed'));
}

export function toggleThemeMode(): ThemeMode {
  const current = getInitialTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setThemeMode(next);
  return next;
}
