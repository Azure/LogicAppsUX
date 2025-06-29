import { makeStyles, tokens } from '@fluentui/react-components';

export const useMonacoStyles = makeStyles({
  root: {
    height: '100%',
    width: '100%',
    minHeight: '50px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  container: {
    // Applied to the container div
  },
});
