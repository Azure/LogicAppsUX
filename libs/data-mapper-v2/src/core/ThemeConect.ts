import {
  type HorizontalSpacingTokens,
  type Theme,
  webDarkTheme,
  webLightTheme,
  themeToTokensObject,
  tokens,
} from '@fluentui/react-components';

interface ExtendedTheme extends Theme {
  [key: string]: any;
}

const spacingOverrides: HorizontalSpacingTokens = {
  spacingHorizontalNone: '0px',
  spacingHorizontalXXS: '2px',
  spacingHorizontalXS: '4px',
  spacingHorizontalSNudge: '6px',
  spacingHorizontalS: '8px',
  spacingHorizontalMNudge: '10px',
  spacingHorizontalM: '12px',
  spacingHorizontalL: '8px',
  spacingHorizontalXL: '10px',
  spacingHorizontalXXL: '12px',
  spacingHorizontalXXXL: '16px',
};

const fnColors = {
  colorFnCategoryCollection: tokens.colorPaletteNavyForeground2,
  colorFnCategoryConversion: tokens.colorPaletteBlueBorderActive,
  colorFnCategoryDateTime: tokens.colorPaletteLightTealBorderActive,
  colorFnCategoryLogical: '#F6CA30',
  colorFnCategoryMath: tokens.colorPaletteMarigoldBorder2,
  colorFnCategoryString: tokens.colorPaletteDarkOrangeForeground3,
  colorFnCategoryUtility: tokens.colorPaletteMagentaBorderActive,
  colorFnCategoryCustom: tokens.colorPaletteDarkGreenBackground2,
};

const extendedWebLightTheme: ExtendedTheme = {
  ...webLightTheme,
  ...fnColors,
};

export const customTokens = themeToTokensObject(extendedWebLightTheme);

export const getCustomizedTheme = (isLightTheme: boolean): ExtendedTheme => ({
  ...(isLightTheme ? webLightTheme : webDarkTheme),
  ...spacingOverrides,
  ...fnColors,
});
