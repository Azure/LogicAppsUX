import { makeStyles, tokens } from '@fluentui/react-components';

export const usePanelStyles = makeStyles({
  drawer: {
    zIndex: 1000,
    height: '100%',
  },
  header: {
    padding: '16px 20px',
    background: tokens.colorNeutralBackground1,
    flexShrink: 0,
  },
  headerSubtitle: {
    color: tokens.colorNeutralForeground3,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  body: {
    padding: '0 20px',
    overflow: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 130px)',
    minHeight: '80vh',
  },
  footer: {
    padding: `${tokens.spacingVerticalM} 20px`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '10%',
  },

  loadingText: {
    paddingTop: '10px',
  },
});

export const useCreatePanelStyles = makeStyles({
  container: {
    padding: '10px',
  },

  sectionItem: {
    flexDirection: 'column',
    gap: '8px',
  },

  paramField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '8px',
  },

  paramLabel: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    lineHeight: tokens.lineHeightBase300,
  },

  secretField: {
    height: 'inherit',
  },

  dropdown: {
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderBottomColor: tokens.colorNeutralStrokeAccessible,
    borderRadius: tokens.borderRadiusMedium,
    height: '32px',
  },

  combobox: {
    width: '100%',
  },

  disabledField: {
    marginLeft: tokens.spacingHorizontalXXL,
  },
});

export const useEditPanelStyles = makeStyles({
  infoBar: {
    margin: '20px 0',
  },

  sectionItem: {
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '16px',
  },
});

export const useAddFilePanelStyles = makeStyles({
  fileNameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden',
    maxWidth: '100%',
  },

  fileNameText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },

  inputCell: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalXS}`,
  },

  inputText: {
    width: '100%',
  },

  errorInput: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '7%',
  },

  actionButton: {
    margin: `0 ${tokens.spacingHorizontalXS}`,
  },

  sectionItem: {
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '24px',
    width: '60%',
  },
});
