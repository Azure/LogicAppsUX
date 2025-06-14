import { makeStyles, tokens } from '@fluentui/react-components';

export const useSettingTokenStyles = makeStyles({
  subComponentContainer: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  newResourceContainer: {
    alignContent: 'center',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    color: tokens.colorBrandStroke1,
  },
});
