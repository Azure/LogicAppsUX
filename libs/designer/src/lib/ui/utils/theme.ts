import { getTheme } from '@fluentui/react/lib/Styling';

export function isHighContrastBlackOrInverted(): boolean {
  if (isHighContrastBlack()) {
    return true;
  }

  const { isInverted } = getTheme();
  return isInverted;
}

function isHighContrastBlack(): boolean {
  const supportsHighContrastMode = /Edg\/\d./i.test(navigator.userAgent);
  if (!supportsHighContrastMode) {
    return false;
  }

  // NOTE(joechung): High contrast black sets the background color of the body element to black.
  const computedStyle = window.getComputedStyle(document.body);
  return computedStyle.backgroundColor === 'rgb(0, 0, 0)';
}
