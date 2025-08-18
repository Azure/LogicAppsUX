import { makeStyles, tokens } from '@fluentui/react-components';

export const usePeekStyles = makeStyles({
  root: {
    height: '99%', // For some reason 100% causes a scrollbar to appear
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'auto',
  },
});
