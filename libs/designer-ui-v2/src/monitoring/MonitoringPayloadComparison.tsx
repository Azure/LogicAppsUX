import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

const MONITORING_PANE_MIN_WIDTH = '20rem';

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    rowGap: tokens.spacingVerticalL,
  },
  comparisonGrid: {
    display: 'grid',
    // Tracks wrap against this pane's available width, including when the drawer is pinned or resized.
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MONITORING_PANE_MIN_WIDTH}), 1fr))`,
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalL,
  },
  pane: {
    minInlineSize: 0,
  },
});

export interface MonitoringPayloadComparisonProps {
  inputsSection: ReactNode;
  outputsSection: ReactNode;
  propertiesSection: ReactNode;
  className?: string;
}

/**
 * Responsive Inputs/Outputs shell for host-owned monitoring sections.
 * Layout only: the host still owns payload rendering, links, copy, and loading/error states.
 */
export const MonitoringPayloadComparison: React.FC<MonitoringPayloadComparisonProps> = ({
  inputsSection,
  outputsSection,
  propertiesSection,
  className,
}) => {
  const styles = useStyles();

  return (
    <div className={mergeClasses(styles.root, className)} data-monitoring-payload-comparison="">
      <div className={styles.comparisonGrid} data-monitoring-payload-grid="">
        <div className={styles.pane}>{inputsSection}</div>
        <div className={styles.pane}>{outputsSection}</div>
      </div>
      {propertiesSection}
    </div>
  );
};
