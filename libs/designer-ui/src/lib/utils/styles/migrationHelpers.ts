/**
 * Migration helpers for converting LESS to makeStyles
 * These mappings help automate the transformation process
 *
 * Note: String values containing 'tokens.' and 'designTokens.' are template references
 * for code generation, not actual variable references.
 */

/**
 * Map LESS color variables to design tokens
 */
export const colorVariableMap: Record<string, string> = {
  // Background colors
  '@scope-background-color': 'tokens.colorNeutralBackground1',
  '@scopev2-background-color': 'tokens.colorNeutralBackground2',
  '@designerBackgroundColor': 'tokens.colorNeutralBackground3',
  '@panel-background-color': 'tokens.colorNeutralBackground1',
  '@card-background-color': 'tokens.colorNeutralBackground1',
  '@hoverColor': 'tokens.colorNeutralBackground1Hover',
  '@disabled-background-color': 'tokens.colorNeutralBackgroundDisabled',
  '@selected-item-background-color': 'tokens.colorNeutralBackground1Selected',

  // Text colors
  '@profile-text-color': 'tokens.colorNeutralForeground2',
  '@card-text-color': 'tokens.colorNeutralForeground1',
  '@defaultBrandColor': 'tokens.colorNeutralForeground1',
  '@disabled-foreground-color': 'tokens.colorNeutralForegroundDisabled',
  '@parameter-placeholder-color': 'tokens.colorNeutralForeground3',
  '@parameter-value-color': 'tokens.colorNeutralForeground1',
  '@menu-items-icon-color': 'tokens.colorNeutralForeground1',

  // Button colors
  '@defaultButtonColor': 'tokens.colorBrandBackground',
  '@defaultButtonHoverColor': 'tokens.colorBrandBackgroundHover',
  '@defaultButtonDisabledColor': 'tokens.colorNeutralBackgroundDisabled',
  '@defaultButtonTextColor': 'tokens.colorNeutralForegroundInverted',

  // Border colors
  '@defaultBorderColor': 'tokens.colorNeutralStroke1',
  '@defaultBorder': 'tokens.colorNeutralStroke1',
  '@border': 'tokens.colorNeutralStroke2',

  // Brand colors
  '@primary_focus_blue': 'tokens.colorBrandBackground',
  '@primary_hover_blue': 'tokens.colorBrandBackgroundHover',
  '@primary_border_blue': 'tokens.colorBrandStroke1',

  // Custom colors (preserve exact values)
  '@pinned-item-color': "'#f2610c'",
  '@static-result-icon-color': "'#ffa500'",
  '@brandColor': "'#0058ad'",
  '@brandColorLight': "'#3aa0f3'",
  '@defaultConnectorColor': "'#515151'",
};

/**
 * Map LESS size variables to design tokens
 */
export const sizeVariableMap: Record<string, string> = {
  '@card-min-fixed-width': 'designTokens.sizes.cardMinFixedWidth',
  '@card-min-width': 'designTokens.sizes.cardMinWidth',
  '@card-max-width': 'designTokens.sizes.cardMaxWidth',
  '@card-v2-height': 'designTokens.sizes.cardV2Height',
  '@card-v2-width': 'designTokens.sizes.cardV2Width',
  '@panel-mode-card-width': 'designTokens.sizes.panelModeCardWidth',
  '@parameter-inputbox-height': 'designTokens.sizes.parameterInputboxHeight',
  '@parameter-label-width': 'designTokens.sizes.parameterLabelWidth',
  '@token-height': 'designTokens.sizes.tokenHeight',
  '@insert-button-size': 'designTokens.sizes.insertButtonSize',
  '@card-header-height': 'designTokens.sizes.cardHeaderHeight',
  '@card-header-icon-size': 'designTokens.sizes.cardHeaderIconSize',
  '@badge-width': 'designTokens.sizes.badgeWidth',
};

/**
 * Map LESS spacing variables to tokens
 */
export const spacingVariableMap: Record<string, string> = {
  '@parameter-label-inputbox-margin': 'tokens.spacingHorizontalS',
  '@parameter-inputbox-start-padding': 'tokens.spacingHorizontalM',
  '@parameter-interval-margin': 'tokens.spacingVerticalXS',
  '@diet-view-parameter-interval-margin': 'tokens.spacingVerticalM',
  '@badge-margin-left': 'tokens.spacingHorizontalM',
  '@badge-margin-right': 'tokens.spacingHorizontalXS',
};

/**
 * Map LESS font variables to tokens
 */
export const fontVariableMap: Record<string, string> = {
  '@font-family': 'tokens.fontFamilyBase',
  '@header-font-family': 'tokens.fontFamilyBase',
  '@semibold-font-family': 'tokens.fontFamilyBase',
  '@card-label-font-size': 'tokens.fontSizeBase200',
  '@card-body-font-size': 'tokens.fontSizeBase200',
  '@card-header-font-size': 'tokens.fontSizeBase300',
  '@token-font-size': 'tokens.fontSizeBase200',
  '@parameter-value-font-size': 'tokens.fontSizeBase200',
};

/**
 * Transform CSS property names to camelCase
 */
export const cssToCamelCase = (prop: string): string => {
  return prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Transform LESS variable reference to token reference
 */
export const transformVariable = (value: string): string => {
  // Check each mapping type
  for (const [lessVar, token] of Object.entries(colorVariableMap)) {
    if (value.includes(lessVar)) {
      return value.replace(lessVar, `\${${token}}`);
    }
  }
  for (const [lessVar, token] of Object.entries(sizeVariableMap)) {
    if (value.includes(lessVar)) {
      return value.replace(lessVar, `\${${token}}`);
    }
  }
  for (const [lessVar, token] of Object.entries(spacingVariableMap)) {
    if (value.includes(lessVar)) {
      return value.replace(lessVar, `\${${token}}`);
    }
  }
  for (const [lessVar, token] of Object.entries(fontVariableMap)) {
    if (value.includes(lessVar)) {
      return value.replace(lessVar, `\${${token}}`);
    }
  }
  return value;
};

/**
 * Common CSS value transformations
 */
export const transformValue = (value: string): string => {
  // Handle variable references
  if (value.includes('@')) {
    return transformVariable(value);
  }

  // Handle numeric zero
  if (value === '0') {
    return '0';
  }

  // Handle calc expressions
  if (value.includes('calc(')) {
    return value.replace(/calc\((.*?)\)/, (match, expr) => {
      const transformed = transformVariable(expr);
      return `calc(${transformed})`;
    });
  }

  // Default: wrap in quotes
  return `'${value}'`;
};

/**
 * Transform a LESS rule to makeStyles format
 */
export const transformRule = (property: string, value: string): [string, string] => {
  const camelProp = cssToCamelCase(property);
  const transformedValue = transformValue(value);

  // Special handling for certain properties
  if (property === 'content' && !value.startsWith('"')) {
    return [camelProp, `'"${value}"'`];
  }

  return [camelProp, transformedValue];
};

/**
 * Generate makeStyles import statement
 */
export const generateImports = (hasShorthands = false, hasTokens = true): string => {
  const imports = ['makeStyles'];
  if (hasShorthands) {
    imports.push('shorthands');
  }
  if (hasTokens) {
    imports.push('tokens');
  }

  return `import { ${imports.join(', ')} } from '@fluentui/react-components';`;
};

/**
 * Generate component style hook template
 */
export const generateStyleHook = (componentName: string, styles: string): string => {
  return `${generateImports(true, true)}
import { designTokens } from '../../tokens/designTokens';

export const use${componentName}Styles = makeStyles({
${styles}
});`;
};
