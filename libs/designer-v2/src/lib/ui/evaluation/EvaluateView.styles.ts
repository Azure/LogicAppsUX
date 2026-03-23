import { makeStyles, tokens } from '@fluentui/react-components';

export const useEvaluateViewStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  panelRoot: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
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
    minWidth: '280px',
  },
  panelDetail: {
    flex: '1',
    minWidth: '0',
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

  formRow: {
    display: 'flex',
    flexWrap: 'wrap',
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
    wordBreak: 'break-word',
    backgroundColor: tokens.colorNeutralBackground3,
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: tokens.fontSizeBase200,
    overflow: 'hidden',
  },
  definitionActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    paddingTop: '12px',
  },
  tokenStats: {
    display: 'flex',
    flexWrap: 'wrap',
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
    wordBreak: 'break-word',
    overflow: 'hidden',
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
  loadingContainerFull: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: '1',
    padding: '24px',
  },
  panelSubtitle: {
    marginTop: '4px',
  },
  toolCallsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },
  toolCallsListEditable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
  },
  resultBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  reasonSection: {
    marginTop: '8px',
  },
  preFormattedCode: {
    margin: '0',
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'pre-wrap',
  },
});
