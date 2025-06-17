import { makeStyles, shorthands } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

export const useBatchStyles = makeStyles({
  batchReleaseCriteria: {
    ...shorthands.padding('6px'),
  },

  batchReleaseCriteriaTitle: {
    color: '#0058ad',
    height: '25px',
    fontSize: designTokens.typography.cardHeaderFontSize,
    fontWeight: '600',
  },
});
