import {
  type HorizontalSpacingTokens,
  type Theme,
  webDarkTheme,
  webLightTheme,
  themeToTokensObject,
  tokens,
} from '@fluentui/react-components';
// import { FunctionCategoryColorToken } from '../constants/FunctionConstants';

// & {// category colors
//   [key in FunctionCategoryColorToken]: string};
export type DataMapperTheme = Theme & {
  functionPanelBackground: string;
  panelBackground: string;
  listElemHover: string;

  // node handle and edge colors
  nodeActive: string;
  edgeActive: string;
  handleActive: string;
  handleConnected: string;
  edgeConnected: string;
} & any;

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

const extendedWebLightTheme: DataMapperTheme = {
  functionPanelBackground: '#E8F3FE',
  panelBackground: '#F6FAFE',
  listElemHover: '#D5E4FF',
  // node handle and edge colors
  nodeActive: '#D5E4FF',
  edgeActive: '#62AAD8',
  handleActive: '#62AAD8',
  handleConnected: '#DCE6ED',
  edgeConnected: '#DCE6ED',
  ...webLightTheme,
  ...fnColors,
};

const customDarkTokens = {
  functionPanelBackground: tokens.colorNeutralBackground1,
  panelBackground: tokens.colorNeutralBackground1,
  listElemHover: tokens.colorNeutralBackground1Hover,
  // node handle and edge colors
  nodeActive: '#D5E4FF',
  edgeActive: '#CFE4FA',
  handleActive: '#CFE4FA',
  handleConnected: '#38445A',
  edgeConnected: '#38445A',
};

const extendedWebDarkTheme: DataMapperTheme = {
  ...webDarkTheme,
  ...fnColors,
  ...customDarkTokens,
};

export const customTokens: ReturnType<typeof themeToTokensObject<DataMapperTheme>> =
  themeToTokensObject<DataMapperTheme>(extendedWebLightTheme);

export const getCustomizedTheme = (isLightTheme: boolean): DataMapperTheme => ({
  ...(isLightTheme ? extendedWebLightTheme : extendedWebDarkTheme),
  ...spacingOverrides,
  ...fnColors,
});
