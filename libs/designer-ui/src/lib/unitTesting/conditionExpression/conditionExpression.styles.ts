import { makeStyles, tokens } from '@fluentui/react-components';

export const useConditionExpressionStyles = makeStyles({
  conditionExpressionCallout: {
    // Use design tokens that automatically handle theme switching
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralBackground2}`,
  },
});
