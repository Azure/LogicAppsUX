import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  componentWrapper: {
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  treeWrapper: {
    marginTop: '10px',
  },
  dropdownInputWrapper: {
    alignSelf: 'center',
    cursor: 'pointer',
    display: 'flex',
    width: '187px',
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
    alignSelf: 'center',
    maxHeight: '350px',
    width: '187px',
    overflowY: 'auto',
    overflowBlock: 'scroll',
    ...shorthands.border('1px', 'solid', '#ddd'),
    ...shorthands.borderRadius(tokens.borderRadiusNone),
    ...shorthands.padding(0, 0, '2px', 0),
  },
});

export default useStyles;
