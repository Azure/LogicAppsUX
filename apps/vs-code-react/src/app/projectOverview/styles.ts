import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useProjectOverviewStyles = makeStyles({
  root: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    padding: tokens.spacingHorizontalXL,
    color: 'var(--vscode-foreground)',
    backgroundColor: 'var(--vscode-editor-background)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
  },
  title: {
    margin: 0,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  filter: {
    maxWidth: '420px',
    marginTop: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalL,
  },
  status: {
    marginTop: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalM,
    backgroundColor: 'var(--vscode-textBlockQuote-background)',
    borderLeft: '3px solid var(--vscode-textLink-foreground)',
  },
  liveRegion: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    ...shorthands.borderWidth(0),
  },
  centered: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: tokens.spacingVerticalM,
  },
  tableWrapper: {
    overflowX: 'auto',
    ...shorthands.border('1px', 'solid', 'var(--vscode-panel-border)'),
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerCell: {
    textAlign: 'left',
    backgroundColor: 'var(--vscode-sideBar-background)',
    borderBottom: '1px solid var(--vscode-panel-border)',
  },
  sortButton: {
    width: '100%',
    justifyContent: 'flex-start',
    fontWeight: tokens.fontWeightSemibold,
  },
  columnLabel: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    fontWeight: tokens.fontWeightSemibold,
  },
  cell: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    verticalAlign: 'top',
    borderBottom: '1px solid var(--vscode-panel-border)',
  },
  workflowName: {
    fontWeight: tokens.fontWeightSemibold,
  },
  secondary: {
    color: 'var(--vscode-descriptionForeground)',
    fontSize: tokens.fontSizeBase200,
  },
  cellActions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '20px',
    padding: `0 ${tokens.spacingHorizontalS}`,
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  statusSuccess: {
    color: tokens.colorPaletteGreenForeground2,
    backgroundColor: tokens.colorPaletteGreenBackground2,
  },
  statusDanger: {
    color: tokens.colorPaletteRedForeground2,
    backgroundColor: tokens.colorPaletteRedBackground2,
  },
  statusRunning: {
    color: tokens.colorPaletteBlueForeground2,
    backgroundColor: tokens.colorPaletteBlueBackground2,
  },
  statusNeutral: {
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  url: {
    maxWidth: '360px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});
