import { makeStyles, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

export const useCopyInputControlStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    gap: tokens.spacingHorizontalXS,
  },
  textInput: {
    backgroundColor: designTokens.colors.disabledBackground,
    color: designTokens.colors.disabledForeground,
    flex: '1',
    '& input': {
      fontSize: designTokens.typography.parameterValueFontSize,
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  },
  dialogSurface: {
    width: '90vw',
    height: '90vh',
    maxWidth: '1400px',
    maxHeight: '900px',
    display: 'flex',
    flexDirection: 'column',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: tokens.spacingVerticalM,
    right: tokens.spacingHorizontalM,
    zIndex: 1,
  },
  closeButton: {
    minWidth: 'auto',
    width: '32px',
    height: '32px',
    padding: tokens.spacingHorizontalXS,
  },
  dialogBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  dialogContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    padding: 0,
  },
  iframeContainer: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    position: 'relative',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: designTokens.colors.cardBackground,
  },
  dialogActions: {
    flexShrink: 0,
    justifyContent: 'flex-end',
    paddingTop: tokens.spacingVerticalM,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: tokens.borderRadiusMedium,
  },
  errorContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalXL,
    textAlign: 'center',
  },
  errorMessage: {
    color: designTokens.colors.schemaEditorFormFieldErrorColor,
  },
  copiedButton: {
    color: tokens.colorPaletteGreenForeground1,
  },
  textInputSelected: {
    flex: '1',
    '& input': {
      fontSize: designTokens.typography.parameterValueFontSize,
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
  },
  apiKeyContainer: {
    marginLeft: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    borderLeft: `2px solid ${tokens.colorNeutralStroke2}`,
    position: 'relative',
  },
  apiKeyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalXS,
  },
  apiKeyIcon: {
    color: tokens.colorNeutralForeground2,
  },
});
