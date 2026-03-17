import { makeStyles } from '@fluentui/react-components';

export const useWizardStyles = makeStyles({
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

  emptyViewContainer: {
    height: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  emptyViewContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '50px',
  },

  icon: {
    width: '80px',
    height: '80px',
  },

  emptyViewTitle: {
    padding: '20px 0 10px 0',
  },

  emptyViewButtons: {
    padding: '10px 0',
  },
});

export const useListStyles = makeStyles({
  tableStyle: {
    width: '95%',
  },

  tableCell: {
    border: 'none',
    paddingBottom: '8px',
  },

  rowCell: {
    paddingTop: '6px',
    alignItems: 'center',
  },

  icon: {
    marginRight: '8px',
  },

  iconsCell: {
    textAlign: 'right',
    border: 'none',
    paddingBottom: '8px',
    width: '8%',
  },

  nameCell: {
    display: 'flex',
  },

  nameText: {
    display: 'flex',
    gap: '8px',
    marginTop: '6px',
  },

  hubNameCell: {},

  artifactNameCell: {
    marginLeft: '32px',
  },

  statusCell: {
    display: 'flex',
    gap: '4px',
  },

  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
  },

  tableHeader: {
    borderBottom: '1px solid #E1DFDD',
  },

  tableHeaderCell: {
    fontWeight: '600',
    color: '#605E5C',
    paddingBottom: '8px',
  },

  tableRow: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
  },

  toolNameCell: {
    paddingTop: '6px',
    alignItems: 'center',
    display: 'flex',
  },

  lastCell: {
    width: '8%',
  },
});
