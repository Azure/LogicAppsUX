import Constants from '../constants';
import type { IButtonStyles } from '@fluentui/react';
import { hexToRgbA } from '@microsoft-logic-apps/utils';

export function getCardStyle(brandColor?: string): React.CSSProperties {
  return {
    borderLeft: `4px solid ${getBrandColorRgbA(brandColor, /* opacity */ 1)}`,
    borderRadius: '2px',
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
  return brandColor ? { backgroundColor: getBrandColorRgbA(brandColor, /* opacity */ 1) } : undefined;
}

export function getBrandColorRgbA(
  brandColor = Constants.DEFAULT_BRAND_COLOR,
  opacity = Constants.DEFAULT_HEADER_AND_TOKEN_OPACITY
): string {
  try {
    return hexToRgbA(brandColor, opacity);
  } catch {
    return hexToRgbA(Constants.DEFAULT_BRAND_COLOR, opacity);
  }
}
