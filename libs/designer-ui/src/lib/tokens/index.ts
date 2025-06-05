/**
 * Design tokens for LogicAppsUX
 *
 * This module exports centralized design tokens that replace .less variables
 * throughout the codebase. All tokens are mapped to Fluent UI v9 design tokens
 * for consistency and theme support.
 *
 * Usage:
 * ```typescript
 * import { designTokens } from './tokens';
 * import { makeStyles } from '@fluentui/react-components';
 *
 * const useStyles = makeStyles({
 *   card: {
 *     minWidth: designTokens.sizes.cardMinWidth,
 *     backgroundColor: designTokens.colors.cardBackground,
 *     fontFamily: designTokens.typography.fontFamily,
 *   }
 * });
 * ```
 */

export { designTokens, type DesignTokens } from './designTokens';

// Re-export commonly used Fluent UI utilities for convenience
export {
  makeStyles,
  shorthands,
  tokens,
  mergeClasses,
  type GriffelStyle,
} from '@fluentui/react-components';
