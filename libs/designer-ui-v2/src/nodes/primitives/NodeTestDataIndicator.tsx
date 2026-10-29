import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
import { BeakerRegular } from '@fluentui/react-icons';
import { designerUiTokens } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import { defaultNodeStrings } from '../strings';
const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${nodeMetrics.testData.size}px`,
    height: `${nodeMetrics.testData.size}px`,
    color: designerUiTokens.nodeTestDataForeground,
    fontSize: `${nodeMetrics.testData.icon}px`,
    '@media (forced-colors: active)': { color: 'CanvasText' },
  },
});
export interface NodeTestDataIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
}
export const NodeTestDataIndicator = forwardRef<HTMLSpanElement, NodeTestDataIndicatorProps>(function NodeTestDataIndicator(
  { label = defaultNodeStrings.status.mock, className, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <span {...rest} ref={ref} className={mergeClasses(styles.root, className)} role="img" aria-label={label} data-badge-status="mock">
      <BeakerRegular aria-hidden="true" />
    </span>
  );
});
