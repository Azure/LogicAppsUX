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
});
