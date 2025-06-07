import { mergeClasses, shorthands } from '@fluentui/react-components';

/**
 * Utility functions for common style patterns
 * Replaces LESS mixins with JavaScript functions
 */

/**
 * Text truncation utilities
 */
export const truncateText = () => ({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const multiLineTruncate = (lines: number) => ({
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  textOverflow: 'ellipsis',
});

/**
 * Flexbox utilities
 */
export const flexCenter = () => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const flexBetween = () => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const flexColumn = () => ({
  display: 'flex',
  flexDirection: 'column',
});

/**
 * Position utilities
 */
export const absoluteFill = () => ({
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

export const absoluteCenter = () => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
});

/**
 * Focus style utilities
 */
export const focusVisible = (color = '#0078d4'): any => ({
  ':focus-visible': {
    ...shorthands.outline('2px', 'solid', color),
    outlineOffset: '2px',
  },
});

export const keyboardFocus = (color = '#0078d4'): any => ({
  ':focus': {
    ...shorthands.outline('none'),
  },
  ':focus-visible': {
    ...shorthands.outline('2px', 'solid', color),
    outlineOffset: '2px',
  },
});

/**
 * Node button interaction (from mixins.less)
 */
export const nodeButtonInteraction = (): any => ({
  ':hover': {
    filter: 'invert(1) brightness(1.15) invert(1)',
  },
  ':focus': {
    ...shorthands.outline('1px', 'solid', 'white'),
    outlineOffset: '-3px',
  },
});

/**
 * Animation utilities
 */
export const fadeIn = (duration = '0.3s') => ({
  animationName: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  animationDuration: duration,
  animationFillMode: 'both',
});

export const slideInFromRight = (duration = '0.3s') => ({
  animationName: {
    from: { transform: 'translateX(100%)' },
    to: { transform: 'translateX(0)' },
  },
  animationDuration: duration,
  animationFillMode: 'both',
});

export const pulse = () => ({
  animationName: {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.5 },
    '100%': { opacity: 1 },
  },
  animationDuration: '1.5s',
  animationIterationCount: 'infinite',
});

/**
 * Shadow utilities
 */
export const cardShadow = () => ({
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
});

export const elevatedShadow = () => ({
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
});

/**
 * Responsive utilities
 */
export const hideOnMobile = () => ({
  '@media (max-width: 620px)': {
    display: 'none',
  },
});

export const mobileFullWidth = () => ({
  '@media (max-width: 620px)': {
    width: '100%',
    maxWidth: '100%',
  },
});

/**
 * Theme-aware style helper
 */
export const themeAwareStyles = (lightStyles: any, darkStyles: any, isInverted: boolean): string => {
  return isInverted ? mergeClasses(lightStyles as any, darkStyles as any) : (lightStyles as any);
};

/**
 * Conditional style helper
 */
export const conditionalStyles = (baseClass: string, conditionalClasses: [boolean, string][]): string => {
  const classes = [baseClass];
  conditionalClasses.forEach(([condition, className]) => {
    if (condition && className) {
      classes.push(className);
    }
  });
  return mergeClasses(...classes);
};

/**
 * Merge multiple style objects
 */
export const mergeStyles = (...styles: (any | undefined)[]) => {
  return Object.assign({}, ...styles.filter(Boolean));
};
