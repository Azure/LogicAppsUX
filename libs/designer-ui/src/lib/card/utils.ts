import Constants from '../constants';
import type { IButtonStyles } from '@fluentui/react';
import { getAdjustedBackgroundColor, hexToRgbA } from '@microsoft/logic-apps-shared';

export function getCardStyle(brandColor?: string, subtleBackground = false, isDark = false): React.CSSProperties {
  let backgroundColor = undefined;

  if (brandColor && subtleBackground) {
    backgroundColor = getAdjustedBackgroundColor(brandColor, isDark);
  }

  return {
    borderLeft: `4px solid ${brandColor}`,
    borderRadius: '2px',
    ...(backgroundColor && { backgroundColor }),
  };
}

export function getCardButtonsStyle(themeColor: string): IButtonStyles {
  return {
    icon: {
      color: themeColor,
      width: 15,
      height: 15,
    },
    flexContainer: {
      width: 15,
      height: 15,
    },
    root: {
      marginTop: 11,
      padding: 0,
      margin: 0,
      width: 15,
      marginLeft: 12,
      marginRight: 10,
    },
  };
}

export function getHeaderStyle(brandColor?: string): React.CSSProperties | undefined {
  return brandColor ? { backgroundColor: brandColor } : undefined;
}

// This is often unnecessary and takes ~0.5ms to run each time
// Not an issue on small uses but with 500 operations it's 250ms * each use to run
export function getBrandColorRgbA(brandColor = Constants.DEFAULT_BRAND_COLOR, opacity = 0.15): string {
  try {
    return hexToRgbA(brandColor, opacity);
  } catch {
    return hexToRgbA(Constants.DEFAULT_BRAND_COLOR, opacity);
  }
}

const opacityHexValues = {
  1.0: 'FF',
  0.7: 'B3',
  0.5: '80',
  0.3: '4D',
  0.15: '26',
  0.1: '1A',
};

// Faster brand color with opacity, no need to calculate, we can just use common values
export function getBrandColorWithOpacity(brandColor = Constants.DEFAULT_BRAND_COLOR, opacity: keyof typeof opacityHexValues): string {
  return `${brandColor}${opacityHexValues[opacity]}`;
}
