import {
  createDarkTheme,
  createLightTheme,
  BrandVariants,
  Theme,
  webLightTheme,
  webDarkTheme,
} from '@fluentui/react-components';

export interface ThemeConfig {
  primaryColor?: string;
  lightThemeOverrides?: Partial<Theme>;
  darkThemeOverrides?: Partial<Theme>;
}

const defaultBrandColors: BrandVariants = {
  10: '#020306',
  20: '#0d1c33',
  30: '#0e2950',
  40: '#0e3665',
  50: '#0f437a',
  60: '#0f5290',
  70: '#0f61a5',
  80: '#1071bb',
  90: '#2382cc',
  100: '#3993d8',
  110: '#50a4e3',
  120: '#67b5ed',
  130: '#81c5f6',
  140: '#9dd6fe',
  150: '#bde6ff',
  160: '#e3f5ff',
};

export const createCustomTheme = (config?: ThemeConfig) => {
  const brandColors = config?.primaryColor
    ? generateBrandVariants(config.primaryColor)
    : defaultBrandColors;

  const lightTheme = {
    ...createLightTheme(brandColors),
    ...config?.lightThemeOverrides,
  };

  const darkTheme = {
    ...createDarkTheme(brandColors),
    ...config?.darkThemeOverrides,
  };

  return { lightTheme, darkTheme };
};

// Helper function to generate brand variants from a single color
function generateBrandVariants(primaryColor: string): BrandVariants {
  // This is a simplified version - in production, you'd want more sophisticated color generation
  return {
    10: adjustBrightness(primaryColor, -80),
    20: adjustBrightness(primaryColor, -70),
    30: adjustBrightness(primaryColor, -60),
    40: adjustBrightness(primaryColor, -50),
    50: adjustBrightness(primaryColor, -40),
    60: adjustBrightness(primaryColor, -30),
    70: adjustBrightness(primaryColor, -20),
    80: adjustBrightness(primaryColor, -10),
    90: primaryColor,
    100: adjustBrightness(primaryColor, 10),
    110: adjustBrightness(primaryColor, 20),
    120: adjustBrightness(primaryColor, 30),
    130: adjustBrightness(primaryColor, 40),
    140: adjustBrightness(primaryColor, 50),
    150: adjustBrightness(primaryColor, 60),
    160: adjustBrightness(primaryColor, 70),
  };
}

// Simple brightness adjustment function
function adjustBrightness(color: string, percent: number): string {
  // Convert hex to RGB
  const num = parseInt(color.replace('#', ''), 16);
  const r = (num >> 16) + percent;
  const g = ((num >> 8) & 0x00ff) + percent;
  const b = (num & 0x0000ff) + percent;

  // Ensure values are within 0-255
  const clamp = (val: number) => Math.max(0, Math.min(255, val));

  // Convert back to hex
  return '#' + (0x1000000 + clamp(r) * 0x10000 + clamp(g) * 0x100 + clamp(b)).toString(16).slice(1);
}

// Export default themes
export const defaultLightTheme = webLightTheme;
export const defaultDarkTheme = webDarkTheme;
