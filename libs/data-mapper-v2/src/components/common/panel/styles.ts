import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    backgroundColor: '#E8F3FE',
    ...shorthands.borderLeft('1px', 'solid', '#ddd'),
    ...shorthands.borderRight('1px', 'solid', '#ddd'),
    width: '350px',
    height: '100%',
  },
  header: {
    paddingTop: '15px',
    width: '100%',
  },
  title: {
    fontWeight: '600',
  },
  titleIcon: {
    display: 'inline-block',
    verticalAlign: 'text-bottom',
    marginRight: '5px',
  },
  subTitle: {
    display: 'block',
    fontSize: '13px',
    color: tokens.colorNeutralForegroundDisabled,
  },
  search: {
    width: '100%',
    alignSelf: 'center',
  },
  body: {
    height: '100%',
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    paddingRight: '5px',
    paddingLeft: '10px',
    width: '100%',
  },
  footer: {
    backgroundColor: 'transparent',
  },
  closeHeaderButton: {
    paddingBottom: '0px',
    paddingTop: '0px',
  },
});
