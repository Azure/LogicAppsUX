import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  xsltStyles: {
    display: 'block',
    height: '80px',
    marginLeft: '30px',
    backgroundColor: tokens.colorNeutralForegroundInverted,
  },
  componentWrapper: {
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    zIndex: 999,
  },
  treeWrapper: {
    display: 'block',
    backgroundColor: tokens.colorNeutralForegroundInverted,
    marginTop: '10px',
  },
  dropdownInputWrapper: {
    alignSelf: 'center',
    cursor: 'pointer',
    display: 'flex',
    width: '240px',
    marginLeft: '-30px',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralForeground1),
    ...shorthands.borderRadius(tokens.borderRadiusNone),
    ...shorthands.padding('2px'),
  },
  dropdownInput: {
    marginLeft: '2px',
  },
  dropdownChevronIcon: {
    verticalAlign: 'middle',
    height: '20px',
    marginLeft: 'auto',
  },
  dropdownInputValue: {
    display: 'block',
    alignSelf: 'center',
    maxHeight: '350px',
    marginLeft: '-30px',
    width: '240px',
    overflowY: 'auto',
    overflowBlock: 'scroll',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusNone),
    ...shorthands.padding('2px'),
  },
});

export default useStyles;
