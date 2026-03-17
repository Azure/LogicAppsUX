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
  panelHeaderWithBack: {
    padding: '8px 16px',
  },
  panelTitle: {
    margin: '0',
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  searchContainer: {
    padding: '8px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  listContainer: {
    flex: '1',
    overflow: 'auto',
  },
  listItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  listItemSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  runName: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  runTiming: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    marginTop: '2px',
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
  emptyTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    margin: '0 0 4px 0',
  },
  emptySubtext: {
    fontSize: tokens.fontSizeBase200,
    margin: '0',
    opacity: 0.7,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '24px',
  },
  // Table styles for evaluators panel
  tableHeader: {
    display: 'flex',
    padding: '8px 16px',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    cursor: 'pointer',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  tableRowSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  colType: {
    width: '140px',
    flexShrink: 0,
    fontSize: tokens.fontSizeBase200,
  },
  colName: {
    flex: '1',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  colActions: {
    display: 'flex',
    gap: '4px',
    flexShrink: 0,
  },
  colResult: {
    width: '70px',
    flexShrink: 0,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  // Agent actions list
  actionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    cursor: 'pointer',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  actionItemSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  actionIndex: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: tokens.colorNeutralBackground3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    flexShrink: 0,
  },
  actionDetails: {
    flex: '1',
    minWidth: 0,
  },
  actionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: tokens.fontSizeBase300,
  },
  actionTiming: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    marginTop: '2px',
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
  fieldLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  fieldValue: {
    fontSize: tokens.fontSizeBase300,
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
  // Result panel
  resultBadge: {
    display: 'inline-flex',
    padding: '4px 12px',
    borderRadius: '12px',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  resultPassed: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
    color: tokens.colorPaletteGreenForeground1,
  },
  resultFailed: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    color: tokens.colorPaletteRedForeground1,
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
  statLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  statValue: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
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
  statusRunning: {
    color: tokens.colorPaletteYellowForeground1,
  },
  // Tabs
  tabContainer: {
    display: 'flex',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  // Card
  card: {
    padding: '16px',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    marginBottom: '16px',
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
  detailLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  detailValue: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
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
