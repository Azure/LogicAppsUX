import { type HorizontalSpacingTokens, type Theme, webDarkTheme, webLightTheme, themeToTokensObject } from '@fluentui/react-components';

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

export const getCustomizedTheme = (isLightTheme: boolean): Theme => ({
  ...(isLightTheme ? webLightTheme : webDarkTheme),
  ...spacingOverrides,
});

const extendedWebLightTheme: ExtendedTheme = {
  ...webLightTheme,
  colorFnCategoryCollection: '#ae8c00',
  colorFnCategoryDateTime: '#4f6bed',
  colorFnCategoryLogical: '#038387',
  colorFnCategoryMath: '#004e8c',
  colorFnCategoryString: '#e43ba6',
  colorFnCategoryUtility: '#8764b8',
  colorFnCategoryConversion: '#814e29',
};

export const customTokens = themeToTokensObject(extendedWebLightTheme);
