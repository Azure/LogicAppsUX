import { makeStyles } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

/**
 * Batch release criteria styles migrated from card/batch.less
 * Original styles for batch processing configuration
 */
export const useBatchStyles = makeStyles({
  batchReleaseCriteria: {
    padding: '6px',
  },
  batchReleaseCriteriaTitle: {
    color: '#0058ad', // Primary blue color from original design
    height: '25px',
    fontSize: designTokens.typography.cardHeaderFontSize,
    fontWeight: '600',
  },
});
