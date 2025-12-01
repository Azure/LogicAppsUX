import { useEffect } from 'react';
import type { ChatTheme } from '../types';

const DEFAULT_THEME: ChatTheme = {
  colors: {
    primary: '#0066cc',
    primaryText: '#ffffff',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e0e0e0',
    error: '#d32f2f',
    success: '#388e3c',
    // Dark mode colors
    backgroundDark: '#1a1a1a',
    surfaceDark: '#2d2d2d',
    textDark: '#e0e0e0',
    textSecondaryDark: '#a0a0a0',
    borderDark: '#404040',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      small: '0.875rem',
      base: '1rem',
      large: '1.125rem',
    },
  },
  spacing: {
    unit: 8,
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
  },
};

export function useTheme(customTheme?: Partial<ChatTheme>, mode: 'light' | 'dark' = 'light') {
  const theme = mergeTheme(DEFAULT_THEME, customTheme);

  useEffect(() => {
    applyTheme(theme, mode);
  }, [theme, mode]);

  return theme;
}

function mergeTheme(defaultTheme: ChatTheme, customTheme?: Partial<ChatTheme>): ChatTheme {
  if (!customTheme) return defaultTheme;

  const result: ChatTheme = {
    colors: { ...defaultTheme.colors, ...customTheme.colors },
    typography: {
      ...defaultTheme.typography,
      ...customTheme.typography,
      fontSize: {
        ...defaultTheme.typography.fontSize,
        ...customTheme.typography?.fontSize,
      },
    },
    spacing: { ...defaultTheme.spacing, ...customTheme.spacing },
    borderRadius: { ...defaultTheme.borderRadius, ...customTheme.borderRadius },
  };

  // Handle optional branding property
  if (customTheme.branding !== undefined) {
    result.branding = customTheme.branding;
  } else if (defaultTheme.branding !== undefined) {
    result.branding = defaultTheme.branding;
  }

  return result;
}

function applyTheme(theme: ChatTheme, mode: 'light' | 'dark') {
  const root = document.documentElement;

  // Apply mode class to root
  root.classList.toggle('chat-dark-mode', mode === 'dark');

  // Colors - apply light or dark mode colors
  const isDark = mode === 'dark';

  // Set primary color-related variables (same for both modes)
  root.style.setProperty('--chat-color-primary', theme.colors.primary);
  root.style.setProperty('--chat-color-primary-text', theme.colors.primaryText);
  root.style.setProperty('--chat-color-error', theme.colors.error);
  root.style.setProperty('--chat-color-success', theme.colors.success);

  // Set mode-specific colors
  root.style.setProperty(
    '--chat-color-background',
    isDark && theme.colors.backgroundDark ? theme.colors.backgroundDark : theme.colors.background
  );
  root.style.setProperty(
    '--chat-color-surface',
    isDark && theme.colors.surfaceDark ? theme.colors.surfaceDark : theme.colors.surface
  );
  root.style.setProperty(
    '--chat-color-text',
    isDark && theme.colors.textDark ? theme.colors.textDark : theme.colors.text
  );
  root.style.setProperty(
    '--chat-color-text-secondary',
    isDark && theme.colors.textSecondaryDark
      ? theme.colors.textSecondaryDark
      : theme.colors.textSecondary
  );
  root.style.setProperty(
    '--chat-color-border',
    isDark && theme.colors.borderDark ? theme.colors.borderDark : theme.colors.border
  );

  // Typography
  root.style.setProperty('--chat-font-family', theme.typography.fontFamily);
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--chat-font-size-${key}`, value);
  });

  // Spacing
  root.style.setProperty('--chat-spacing-unit', `${theme.spacing.unit}px`);

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--chat-radius-${key}`, value);
  });
}
