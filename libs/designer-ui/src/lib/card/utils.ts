import Constants from '../constants';

export function getHeaderStyle(brandColor?: string): React.CSSProperties | undefined {
  return brandColor ? { backgroundColor: brandColor } : undefined;
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
