import { tokens } from '@fluentui/react-components';

/**
 * Design tokens for LogicAppsUX components
 * Maps legacy .less variables to Fluent UI v9 design tokens
 */
export const designTokens = {
  /**
   * Color tokens - mapped from .less variables to Fluent UI tokens
   */
  colors: {
    // Background colors
    scopeBackground: tokens.colorNeutralBackground1,
    scopev2Background: tokens.colorNeutralBackground2,
    designerBackground: tokens.colorNeutralBackground3,
    panelBackground: tokens.colorNeutralBackground1,
    cardBackground: tokens.colorNeutralBackground1,
    hoverColor: tokens.colorNeutralBackground1Hover,
    disabledBackground: tokens.colorNeutralBackgroundDisabled,
    selectedItemBackground: tokens.colorNeutralBackground1Selected,

    // Text colors
    profileText: tokens.colorNeutralForeground2,
    cardText: tokens.colorNeutralForeground1,
    defaultBrand: tokens.colorNeutralForeground1,
    disabledForeground: tokens.colorNeutralForegroundDisabled,
    parameterPlaceholder: tokens.colorNeutralForeground3,
    parameterValue: tokens.colorNeutralForeground1,
    menuItemsIcon: tokens.colorNeutralForeground1,

    // Button colors
    defaultButton: tokens.colorBrandBackground,
    defaultButtonHover: tokens.colorBrandBackgroundHover,
    defaultButtonDisabled: tokens.colorNeutralBackgroundDisabled,
    defaultButtonText: tokens.colorNeutralForegroundInverted,

    // Border colors
    defaultBorder: tokens.colorNeutralStroke1,
    defaultBorderColor: tokens.colorNeutralStroke1,
    selectedShadow: tokens.colorNeutralShadowKey,

    // Brand colors
    brandColor: tokens.colorBrandBackground,
    brandColorLight: tokens.colorBrandBackgroundHover,
    primaryFocusBlue: tokens.colorBrandBackground,
    primaryHoverBlue: tokens.colorBrandBackgroundHover,
    primaryBorderBlue: tokens.colorBrandStroke1,

    // Status colors
    pinnedItem: '#f2610c', // Keep original orange for pinned items
    staticResultIcon: '#ffa500', // Keep original orange for static results

    // Panel mode specific colors
    panelModeIfContainer: tokens.colorNeutralBackground2,
    panelModePanelBorderColor: tokens.colorNeutralStroke1,
    panelModePanelBorderColorDark: tokens.colorNeutralStroke1,
    panelModeCommentFieldColorDark: tokens.colorNeutralBackground4,
    panelModeCommentFieldColorLight: tokens.colorNeutralBackground2,
    panelModeResizerBorderColor: tokens.colorNeutralStroke2,
    panelModeStatusBarBorderColor: tokens.colorNeutralStroke2,
    panelModeStatusBarSeparatorColor: 'rgba(0, 0, 0, 0.1)',

    // Field validation colors
    mslaFieldDisableColor: tokens.colorNeutralForegroundDisabled,
    schemaEditorFormFieldErrorBorderColor: tokens.colorPaletteRedBorder1,
    schemaEditorFormFieldErrorColor: tokens.colorPaletteRedForeground1,
    schemaEditorInvalidPropertyEditorContainerBorderColor: 'rgba(255, 0, 0, 0.3)',
    schemaEditorJsonEditorContainerBorderColor: tokens.colorNeutralStroke1,
    dateTimeEditorBorderColor: tokens.colorNeutralStroke1,

    // Menu and item colors
    menuItemBackgroundColor: tokens.colorNeutralBackground2,

    // OneUI brand neutral colors (preserve for compatibility)
    oneuiColorBrandNeutral10: tokens.colorNeutralBackground2,
    oneuiColorBrandNeutral20: tokens.colorNeutralBackground3,
    oneuiColorBrandNeutral55: tokens.colorNeutralForeground2,
    oneuiColorBrandNeutral45: tokens.colorNeutralForeground2,
    fallbackIconColor: tokens.colorNeutralBackground2,
  },

  /**
   * Size tokens - preserve exact pixel values from .less variables
   */
  sizes: {
    // Card dimensions
    cardMinFixedWidth: '440px',
    cardMinWidth: '200px',
    cardMaxWidth: '600px',
    cardV2Height: '40px',
    cardV2SmallHeight: '24px',
    cardV2SmallWidth: '92px',
    cardV2Width: '200px',

    // Collapsed card dimensions
    collapsedCardMinWidth: '600px',
    collapsedCardMinWidthPanelMode: '200px',
    cardMinFixedWidthPanelMode: '200px',
    cardMinWidthPanelMode: '200px',
    cardMaxWidthPanelMode: '200px',
    cardMaxHeightPanelMode: '160px',

    // Panel dimensions
    panelModeCardWidth: '200px',
    panelModeExtendedCardHeight: '160px',

    // Parameter dimensions
    parameterInputboxHeight: '26px',
    parameterLabelWidth: '142px',
    parameterDeleteButtonWidth: '30px',

    // Token dimensions
    tokenHeight: '20px',
    tokenTitleMaxLength: '90px',

    // Insert button
    insertButtonSize: '24px',

    // Card header
    cardHeaderHeight: '32px',
    cardHeaderIconSize: '16px',
    cardConnectorDefaultHeight: '40px',

    // Diet view
    dietViewCardMinWidth: '200px',
    dietViewCardMaxWidth: '480px',

    // Connection selector
    mslaConnectionSelectorIconSize: '48px',
    mslaConnectionSelectorOptionsWidth: '120px',

    // Badge dimensions
    badgeWidth: '30px',

    // Multiline editor
    multilineMinHeight: '170px',

    // Menu dimensions
    menuCellHeight: '44px',
    menuCellTitleItemHeight: '25px',
  },

  /**
   * Spacing tokens - map to Fluent UI spacing or preserve exact values
   */
  spacing: {
    parameterLabelInputboxMargin: tokens.spacingHorizontalS,
    parameterInputboxStartPadding: tokens.spacingHorizontalM,
    parameterIntervalMargin: tokens.spacingVerticalXS,
    dietViewParameterIntervalMargin: tokens.spacingVerticalM,
    mslaConnectionSelectorBorderPadding: tokens.spacingHorizontalS,
    badgeBorder: '1px',
    badgeMarginLeft: tokens.spacingHorizontalM,
    badgeMarginRight: tokens.spacingHorizontalXS,
  },

  /**
   * Typography tokens - map to Fluent UI typography tokens
   */
  typography: {
    // Font families
    fontFamily: tokens.fontFamilyBase,
    headerFontFamily: tokens.fontFamilyBase,
    semiboldFontFamily: tokens.fontFamilyBase,

    // Font sizes
    cardLabelFontSize: tokens.fontSizeBase200,
    cardBodyFontSize: tokens.fontSizeBase200,
    cardHeaderFontSize: tokens.fontSizeBase300,
    tokenFontSize: tokens.fontSizeBase200,
    parameterValueFontSize: tokens.fontSizeBase200,
  },

  /**
   * Breakpoints and responsive design
   */
  breakpoints: {
    screenSmMax: '620px',
    mobileWidth: '95%',
    desktopMaxWidth: '1161px',
    connectionWizardExtraSmallWidth: '355px',
  },

  /**
   * Shadow and elevation
   */
  shadows: {
    selectedShadowColor: 'rgba(0, 0, 0, 0.35)',
  },

  /**
   * Border styles
   */
  borders: {
    default: `1px solid ${tokens.colorNeutralStroke1}`,
    defaultBorder: `0.5px solid ${tokens.colorNeutralStroke2}`,
  },

  /**
   * Layout calculations - complex calculated values
   */
  calculations: {
    // Insert button positioning
    insertButtonOffset: 'calc(50% - (24px / 2))',

    // Connection selector width calculation
    mslaConnectionSelectorConnectionWidth: 'calc(100% - 48px - 120px - (8px * 4))',

    // Token picker positioning
    tokenPickerOffsetTop: '-150px',
  },

  /**
   * Z-index values for layering
   */
  zIndex: {
    contextMenu: -1,
  },
} as const;

/**
 * Type-safe access to design tokens
 */
export type DesignTokens = typeof designTokens;
