import { makeStyles, tokens } from '@fluentui/react-components';

export const useNodeSearchPanelStyles = makeStyles({
  searchBox: {
    width: '100%',
    maxWidth: '100%',
  },
  nodeSearchResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  nodeSearchCard: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
  },
  actionIcon: {
    minHeight: '24px',
    minWidth: '24px',
    borderRadius: '2px',
    overflow: 'hidden',
    objectFit: 'contain',
    backgroundColor: tokens.colorNeutralBackground4,
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    flexGrow: 1,
    wordBreak: 'break-word',
  },
});
