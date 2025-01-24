import { makeStyles, tokens } from '@fluentui/react-components';

export const useMapCheckerItemStyles = makeStyles({
  buttonStyle: {
    padding: '12px',
    width: '210px',
    justifyContent: 'left',
    margin: '5px 0px',
    boxShadow: tokens.shadow4,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerText: {
    fontSize: '13px',
    fontWeight: '600',
    wordBreak: 'break-word',
    marginLeft: '2px',
    width: '60%',
  },
  message: {
    fontSize: '11px',
    wordBreak: 'break-word',
  },
  badge: {
    display: 'block',
    marginBottom: '5px',
    fontSize: '11px',
    alignContent: 'center',
    paddingLeft: '3px',
    paddingRight: '3px',
    borderRadius: '0',
    marginLeft: 'auto',
    color: tokens.colorStrokeFocus2,
  },
  headerContainer: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
  },
  errorBadge: {
    backgroundColor: '#fce2e4',
  },
  warningBadge: {
    backgroundColor: '#fef0e7',
  },
  subtitleText: {
    marginTop: '5px',
    display: 'block',
    color: tokens.colorNeutralForegroundDisabled,
    fontSize: '10px',
  },
});

export const useStyles = makeStyles({
  root: {
    width: '300px',
    paddingLeft: '10px',
  },
  title: {
    fontSize: '16px',
  },
  noDataMessage: {
    fontStyle: 'italic',
    marginTop: '10px',
    fontSize: '12px',
  },
  tabContainer: {
    marginTop: '10px',
  },
  body: {
    alignItems: 'center',
  },
});
