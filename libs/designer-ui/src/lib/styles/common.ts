import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

/**
 * Common utility styles to replace common.less
 * These are shared styles used across multiple components
 */

export const useCommonStyles = makeStyles({
  button: {
    backgroundColor: 'transparent',
    ...shorthands.border('none'),
    fontFamily: tokens.fontFamilyBase,
    cursor: 'pointer',
    fontSize: designTokens.typography.cardBodyFontSize,
    color: designTokens.colors.brandColor,
    lineHeight: designTokens.sizes.parameterInputboxHeight,
  },
  hidden: {
    visibility: 'hidden',
  },
});

export const useCommonDarkThemeStyles = makeStyles({
  button: {
    color: designTokens.colors.brandColorLight,
  },
});

/**
 * Placeholder text styling utility function
 * Replaces the .placeholder() mixin from common.less
 */
export const placeholderTextStyles = () => ({
  '&::-webkit-input-placeholder': {
    fontFamily: tokens.fontFamilyBase,
  },
  '&:-moz-placeholder': {
    fontFamily: tokens.fontFamilyBase,
  },
  '&::-moz-placeholder': {
    fontFamily: tokens.fontFamilyBase,
  },
  '&::placeholder': {
    fontFamily: tokens.fontFamilyBase,
  },
  '&:placeholder-shown': {
    fontFamily: tokens.fontFamilyBase,
  },
});
