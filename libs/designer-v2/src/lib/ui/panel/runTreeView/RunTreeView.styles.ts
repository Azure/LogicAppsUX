import { makeStyles, tokens } from '@fluentui/react-components';

export const useRunTreeViewStyles = makeStyles({
  treeViewContainer: {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    position: 'relative',
  },
  runningSpinner: {
    margin: '8px 30px',
    display: 'inline-flex',
  },
  treeItem: {
    borderRadius: '4px',
    overflow: 'hidden',
    width: '100%',
  },
  treeItemSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  treeItemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexDirection: 'row',
  },
  treeItemIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '2px',
    objectFit: 'cover',
    background: tokens.colorNeutralBackground3,
  },
  treeItemToolIcon: {
    width: '16px',
    height: '16px',
    color: '#3352B9',
  },
  selectionIndicator: {
    width: '4px',
    height: '100%',
    position: 'absolute',
    left: '0px',
    top: '0px',
    background: tokens.colorBrandForeground1,
    borderRadius: '4px',
  },
});
