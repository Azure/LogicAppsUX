import { makeStyles, tokens } from '@fluentui/react-components';

const borderStyle = `1px solid ${tokens.colorNeutralBackground6}`;
const mainGap = '16px';

export const useMcpServerStyles = makeStyles({
  buttonContainer: {
    display: 'flex',
    marginBottom: '16px',
  },
  server: {
    borderRadius: '8px',
    border: borderStyle,
    padding: mainGap,
    backgroundColor: tokens.colorNeutralBackground1,
    marginBottom: '12px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  tableStyle: {
    width: '70%',
    margin: 0,
  },
  rowStyle: {
    border: 'none',
    paddingBottom: '8px',
    borderBottom: '1px solid #ccc',
    paddingLeft: '2px',
  },
  nameCell: {
    paddingTop: '6px',
    alignItems: 'center',
    display: 'flex',
  },
  iconsCell: {
    textAlign: 'right',
    border: 'none',
    padding: '6px 0 8px 2px',
    borderBottom: '1px solid #ccc',
  },
  lastCell: { width: '8%' },
  toolIcon: {
    width: '20px',
    height: '20px',
    paddingRight: '8px',
    borderRadius: tokens.borderRadiusSmall,
    objectFit: 'contain',
    flexShrink: 0,
  },
  serverHeader: { display: 'flex', justifyContent: 'space-between', paddingLeft: 0 },
  serverHeaderTextSection: { marginLeft: '-10px' },
  serverHeaderText: { paddingLeft: 0 },
  serverHeaderActions: { display: 'flex', alignItems: 'center' },
  serverHeaderButtons: { minWidth: '50px', padding: '0 4px' },
  serverHeaderDivider: { padding: '0 8px' },
  serverDescription: { paddingLeft: '28px' },
  serverField: { paddingTop: '10px', paddingLeft: '28px' },
  serverContent: { paddingTop: '10px', paddingLeft: '16px' },
});

export const useMcpServerAddStyles = makeStyles({
  container: { paddingTop: '20px', display: 'flex', gap: '20px' },

  firstCard: { width: '80%' },

  cardHeader: { fontWeight: 600 },
  cardIcon: { width: '28px', height: '28px' },
  cardContent: { padding: '8px 10px' },

  secondCardIcon: { width: '28px', height: '28px', color: tokens.colorCompoundBrandStroke },
});

export const useMcpAuthenticationStyles = makeStyles({
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },

  methodContainer: { display: 'flex', alignItems: 'center', gap: '10px' },

  keysButton: { width: '140px' },

  authLink: { marginLeft: '4px', verticalAlign: 'middle' },
});
