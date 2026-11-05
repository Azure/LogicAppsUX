/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { makeStyles, tokens } from '@fluentui/react-components';

export const useCreateWorkspaceStyles = makeStyles({
  wizard: {
    height: '100vh',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
    color: 'var(--vscode-foreground, #cccccc)',
    fontFamily: 'var(--vscode-font-family, Segoe UI)',
    fontSize: '13px',
    lineHeight: '1.5',
    letterSpacing: '0',
    '& h1': { margin: 0, fontSize: '20px', lineHeight: '1.4', fontWeight: 600 },
    '& h2': { margin: '0 0 6px', fontSize: '18px', lineHeight: '1.4', fontWeight: 600 },
    '& h3': { margin: '0 0 14px', fontSize: '14px', fontWeight: 600 },
    '& p': { margin: '6px 0', overflowWrap: 'anywhere' },
    '& button, & input, & select': { fontFamily: 'inherit', fontSize: '13px' },
  },
  wizardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    padding: '22px 28px 20px',
    borderBottom: '1px solid var(--vscode-widget-border, #333333)',
    flexShrink: 0,
    '& > :first-child': { display: 'flex', flexDirection: 'column', gap: '8px' },
    '& > :last-child': { overflowWrap: 'anywhere', textAlign: 'right', maxWidth: '40%' },
    '@media (max-width: 600px)': { padding: '16px', '& > :last-child': { display: 'none' } },
  },
  wizardMuted: { color: 'var(--vscode-descriptionForeground, #999999)', fontSize: '12px' },
  wizardProgress: {
    padding: '10px 28px',
    backgroundColor: 'var(--vscode-sideBar-background, #252526)',
    flexShrink: 0,
    '@media (max-width: 600px)': { padding: '10px 16px' },
  },
  wizardProgressCaption: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  wizardSteps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 194px))',
    gap: '12px',
    '& button': {
      justifyContent: 'flex-start',
      minHeight: '40px',
      gap: '12px',
      padding: '6px 10px',
      fontWeight: 400,
      color: 'var(--vscode-foreground, #cccccc)',
      whiteSpace: 'normal',
      textAlign: 'left',
    },
    '& button:disabled': { color: 'var(--vscode-foreground, #cccccc)', backgroundColor: 'transparent' },
    '& button[aria-current="step"]': { backgroundColor: 'var(--vscode-list-inactiveSelectionBackground, #1e3543)' },
    '& button[aria-current="step"] > span': {
      backgroundColor: 'var(--vscode-focusBorder, #007fd4)',
      color: 'var(--vscode-button-foreground, #ffffff)',
    },
    '@media (max-width: 480px)': { gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: '4px' },
  },
  wizardStepNumber: {
    width: '24px',
    height: '24px',
    boxSizing: 'border-box',
    flexShrink: 0,
    borderRadius: '50%',
    border: '1px solid var(--vscode-focusBorder, #007fd4)',
    color: 'var(--vscode-foreground, #cccccc)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
  },
  wizardBody: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '20px 28px 28px',
    '& > p': { margin: '6px 0 18px' },
    '@media (max-width: 600px)': { padding: '20px 16px' },
  },
  wizardColumns: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 240px',
    gap: '24px',
    alignItems: 'start',
    '@media (max-width: 800px)': { gridTemplateColumns: 'minmax(0, 1fr)', '& aside': { display: 'none' } },
  },
  wizardFields: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    alignItems: 'start',
    gap: '16px',
    '& > *': { minWidth: 0 },
    '& input': { minWidth: 0, width: '100%', boxSizing: 'border-box' },
    '& select': { minWidth: 0, width: '100%', boxSizing: 'border-box' },
    '@media (max-width: 600px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  wizardLocationFields: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 1fr) minmax(0, 3fr)',
    alignItems: 'start',
    gap: '18px',
    marginBottom: '28px',
    '& > *': { minWidth: 0 },
    '@media (max-width: 600px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  wizardBrowse: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    '& > :first-child': { flex: 1, minWidth: 0 },
    '& > button': { flexShrink: 0 },
  },
  wizardSection: { marginBottom: '24px', '& > [role="radiogroup"]': { width: '100%' } },
  wizardChoices: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
    '& > label': {
      minWidth: 0,
      display: 'flex',
      alignItems: 'flex-start',
      padding: '10px 12px',
      borderRadius: '3px',
      border: '1px solid var(--vscode-widget-border, #454545)',
      cursor: 'pointer',
    },
    '& > label:has(input:checked)': {
      border: '1px solid var(--vscode-focusBorder, #007fd4)',
      backgroundColor: 'var(--vscode-list-inactiveSelectionBackground, #1e3543)',
    },
    '& > label:focus-within': { outline: '1px solid var(--vscode-focusBorder, #007fd4)', outlineOffset: '2px' },
    '& input': { accentColor: 'var(--vscode-button-background, #0078d4)', margin: '5px 10px 0 0', flexShrink: 0 },
    '& strong': { display: 'block', fontWeight: 600 },
    '& small': { display: 'block', marginTop: '3px', color: 'var(--vscode-descriptionForeground, #999999)', fontSize: '12px' },
    '& label > span': { minWidth: 0, overflowWrap: 'anywhere' },
  },
  wizardSelect: {
    height: '32px',
    padding: '0 8px',
    borderRadius: '2px',
    border: '1px solid var(--vscode-dropdown-border, #555555)',
    backgroundColor: 'var(--vscode-dropdown-background, #3c3c3c)',
    color: 'var(--vscode-dropdown-foreground, #f0f0f0)',
    '&:focus-visible': { outline: '1px solid var(--vscode-focusBorder, #007fd4)' },
  },
  wizardAside: {
    border: '1px solid var(--vscode-widget-border, #333333)',
    borderRadius: '3px',
    padding: '16px',
    backgroundColor: 'var(--vscode-sideBar-background, #252526)',
    fontSize: '12px',
    overflowWrap: 'anywhere',
    '& h3': { fontSize: '13px' },
    '& ul': { listStyle: 'none', margin: 0, paddingLeft: '14px' },
    '& li': { marginTop: '9px' },
    '& svg': { verticalAlign: 'middle', marginRight: '6px', color: 'var(--vscode-descriptionForeground, #999999)' },
    '& code': { fontFamily: 'var(--vscode-editor-font-family, Consolas)', fontSize: '11px', overflowWrap: 'anywhere' },
  },
  wizardNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginTop: '22px',
    padding: '12px',
    backgroundColor: 'var(--vscode-textBlockQuote-background, #252f36)',
    border: '1px solid var(--vscode-widget-border, #333333)',
    fontSize: '12px',
    '& svg': { flexShrink: 0, marginTop: '2px', color: 'var(--vscode-textLink-foreground, #4daafc)' },
  },
  wizardPath: { display: 'flex', justifyContent: 'space-between', gap: '20px', marginTop: '28px', overflowWrap: 'anywhere' },
  wizardReview: {
    display: 'grid',
    gap: '12px',
    '& section': { padding: '12px', border: '1px solid var(--vscode-widget-border, #333333)', borderRadius: '3px' },
    '& h3': { marginBottom: '4px' },
  },
  wizardReviewHeading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  wizardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 28px',
    borderTop: '1px solid var(--vscode-widget-border, #333333)',
    backgroundColor: 'var(--vscode-sideBar-background, #252526)',
    flexShrink: 0,
    '& > div': { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' },
    '@media (max-width: 600px)': { padding: '12px 16px', '& > span': { display: 'none' } },
  },
  wizardStatus: {
    padding: '4px 16px',
    textAlign: 'right',
    fontSize: '11px',
    color: 'var(--vscode-descriptionForeground, #999999)',
    flexShrink: 0,
  },
  createWorkspaceContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden', // Prevent container from scrolling
  },

  createWorkspaceTitle: {
    fontSize: tokens.fontSizeBase600,
    padding: '15px 24px',
    flexShrink: 0, // Prevent title from shrinking
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'block',
  },

  stepNavigation: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalL} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0, // Prevent step navigation from shrinking
    backgroundColor: tokens.colorNeutralBackground1,
  },

  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    minWidth: '80px',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },

  stepItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },

  stepItemCompleted: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
    '&:hover': {
      backgroundColor: tokens.colorPaletteGreenBackground2,
    },
  },

  stepItemDisabled: {
    cursor: 'not-allowed',
    opacity: 0.6,
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },

  stepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    marginBottom: tokens.spacingVerticalXS,
  },

  stepNumberActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },

  stepNumberCompleted: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
    color: tokens.colorNeutralForegroundOnBrand,
  },

  stepLabel: {
    fontSize: tokens.fontSizeBase200,
    textAlign: 'center',
    lineHeight: '1.2',
  },

  stepConnector: {
    width: '40px',
    height: '2px',
    backgroundColor: tokens.colorNeutralStroke2,
    marginTop: '12px',
  },

  stepConnectorCompleted: {
    backgroundColor: tokens.colorPaletteGreenBorder1,
  },

  createWorkspaceContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto', // Only the content area scrolls
    minHeight: 0, // Allow flexbox to shrink properly
    padding: `${tokens.spacingVerticalL} ${tokens.spacingVerticalXL}`,
  },

  stepContainer: {
    maxWidth: '800px',
    width: '100%',
    margin: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },

  stepTitle: {
    marginBottom: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
  },

  stepDescription: {
    marginBottom: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground2,
    lineHeight: '1.5',
    fontSize: tokens.fontSizeBase300,
    display: 'block',
  },

  inputField: {
    width: '100%',
    maxWidth: '800px', // Increased to accommodate longer paths
  },

  radioGroup: {
    marginTop: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },

  navigationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalL} ${tokens.spacingVerticalXL}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    flexShrink: 0, // Prevent navigation from shrinking
    minHeight: '72px', // Ensure consistent height
  },

  navigationLeft: {
    display: 'flex',
    alignItems: 'center',
  },

  navigationRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },

  stepIndicator: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
  },

  errorMessage: {
    color: tokens.colorPaletteRedForeground1,
    marginTop: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase200,
  },

  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalS,
  },

  completionMessage: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorPaletteGreenForeground1,
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: `${tokens.spacingVerticalXL}`,
    width: '100%',
    maxWidth: '600px',
    marginBottom: tokens.spacingVerticalXXL,
  },

  radioOption: {
    marginBottom: tokens.spacingVerticalS,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },

  browseButton: {
    alignSelf: 'flex-start',
    flex: '0 0 auto',
    whiteSpace: 'nowrap',
  },

  pathDisplay: {
    marginTop: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-all',
    overflowWrap: 'break-word',
    maxWidth: '800px', // Increased to match fieldContainer
    whiteSpace: 'pre-wrap', // Allow wrapping while preserving formatting
  },

  fieldContainer: {
    width: '100%',
    maxWidth: '800px', // Increased from 500px to accommodate longer paths
    marginBottom: tokens.spacingVerticalM,
  },

  inputControl: {
    width: '100%',
    flex: '1 1 200px',
    minWidth: '200px',
    maxWidth: '800px', // Increased to match the fieldContainer
  },

  radioGroupContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    maxWidth: '800px', // Increased for consistency
  },

  formSection: {
    padding: `${tokens.spacingVerticalL} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    width: '100%',
    maxWidth: '800px', // Increased to accommodate longer paths
    '&:last-child': {
      borderBottom: 'none',
    },
  },

  sectionTitle: {
    marginBottom: tokens.spacingVerticalM,
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    display: 'block',
    lineHeight: tokens.lineHeightBase600,
  },

  workflowTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: tokens.spacingVerticalL,
  },

  workflowTableHeader: {
    borderBottom: `2px solid ${tokens.colorNeutralStroke2}`,
    textAlign: 'left',
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    verticalAlign: 'top',
  },

  workflowTableRow: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },

  workflowTableCell: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    verticalAlign: 'middle',
    fontSize: tokens.fontSizeBase300,
    lineHeight: '1.4',
  },

  workflowColumnHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokens.spacingVerticalS,
    minHeight: '120px',
    padding: tokens.spacingVerticalM,
  },

  workflowRadioContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: tokens.spacingVerticalS,
  },

  workflowTypeContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    flex: 1,
  },

  workflowTypeCell: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },

  workflowTypeTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    marginBottom: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground1,
  },

  workflowTypeDescription: {
    color: tokens.colorNeutralForeground2,
    lineHeight: '1.4',
    fontSize: tokens.fontSizeBase300,
  },

  checkmarkCell: {
    textAlign: 'center',
    width: '60px',
    color: tokens.colorPaletteGreenForeground1,
    fontSize: tokens.fontSizeBase400,
  },

  emptyCell: {
    textAlign: 'center',
    width: '60px',
    color: tokens.colorNeutralForeground3,
  },

  radioCell: {
    textAlign: 'center',
    width: '60px',
  },

  workflowNameField: {
    marginBottom: tokens.spacingVerticalL,
  },

  reviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '800px',
    width: '100%',
  },

  reviewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },

  reviewSectionTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    marginBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingBottom: tokens.spacingVerticalXS,
  },

  reviewRow: {
    display: 'flex',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalXS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    gap: tokens.spacingHorizontalM,
    '&:last-child': {
      borderBottom: 'none',
    },
  },

  reviewLabel: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightMedium,
    color: tokens.colorNeutralForeground2,
    minWidth: '150px',
    textAlign: 'left',
    flexShrink: 0,
  },

  reviewValue: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    textAlign: 'right',
    wordBreak: 'break-word',
    flex: 1,
  },

  reviewValueMissing: {
    color: tokens.colorPaletteRedForeground1,
    fontStyle: 'italic',
  },

  sectionDivider: {
    marginTop: tokens.spacingVerticalXL,
    marginBottom: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: tokens.spacingVerticalM,
  },
});
