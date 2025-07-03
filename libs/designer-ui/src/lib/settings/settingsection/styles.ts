import { makeStyles, tokens } from '@fluentui/react-components';

export const useSettingTokenStyles = makeStyles({
  subComponentContainer: {
    position: 'relative',
  },
  newResourceContainer: {
    alignContent: 'center',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    color: tokens.colorBrandStroke1,
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
