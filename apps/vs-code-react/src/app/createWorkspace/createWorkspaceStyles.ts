/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { makeStyles, tokens } from '@fluentui/react-components';

export const useCreateWorkspaceStyles = makeStyles({
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
  },

  pathDisplay: {
    marginTop: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: 'monospace',
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
