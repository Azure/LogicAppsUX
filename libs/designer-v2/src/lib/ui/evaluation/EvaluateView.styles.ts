import { makeStyles, tokens } from '@fluentui/react-components';

export const useEvaluateViewStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  main: {
    flex: '1',
    display: 'flex',
    overflow: 'hidden',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  panelRuns: {
    width: '320px',
    minWidth: '240px',
  },
  panelEvaluators: {
    width: '420px',
    minWidth: '300px',
  },
  panelDetail: {
    flex: '1',
    minWidth: '300px',
    overflow: 'auto',
    borderRight: 'none',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  searchContainer: {
    padding: '8px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  listContainer: {
    flex: '1',
    overflow: 'auto',
  },
  emptyState: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground2,
    padding: '32px',
    textAlign: 'center',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '24px',
  },
  tableRowSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  colActions: {
    display: 'flex',
    gap: '4px',
    flexShrink: 0,
  },
  // Form styles
  formContent: {
    flex: '1',
    overflow: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  formError: {
    padding: '8px 12px',
    margin: '0 16px',
    borderRadius: '4px',
    backgroundColor: tokens.colorPaletteRedBackground1,
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  formFieldHalf: {
    flex: '1',
  },
  // Tool calls
  toolCallItem: {
    padding: '12px',
    borderRadius: '6px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  toolCallHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  // View panel
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 0',
  },
  promptValue: {
    whiteSpace: 'pre-wrap',
    backgroundColor: tokens.colorNeutralBackground3,
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: tokens.fontSizeBase200,
  },
  definitionActions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '12px',
  },
  tokenStats: {
    display: 'flex',
    gap: '16px',
    padding: '12px 0',
  },
  tokenStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  resultReason: {
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: '6px',
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'pre-wrap',
  },
  // Status indicators
  statusSucceeded: {
    color: tokens.colorPaletteGreenForeground1,
  },
  statusFailed: {
    color: tokens.colorPaletteRedForeground1,
  },
  evaluationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  resultSection: {
    padding: '8px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
  },
  panelChat: {
    width: '380px',
    minWidth: '280px',
    borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatPanelContainer: {
    flex: '1',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
});
