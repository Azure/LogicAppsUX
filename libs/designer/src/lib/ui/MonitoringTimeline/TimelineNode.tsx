import { Text, Tooltip } from '@fluentui/react-components';
import { equals, idDisplayCase } from '@microsoft/logic-apps-shared';
import { useEffect, useMemo, useRef } from 'react';
import type { TimelineRepetition } from './hooks';
import { ConnectorIcon } from './ConnectorIcon';
import { Failed } from '@microsoft/designer-ui';
import { useMonitoringTimelineStyles } from './monitoringTimeline.styles';

const TimelineNode = ({
  selected,
  onSelect,
  isExpanded,
  data,
}: {
  selected: boolean;
  onSelect: () => void;
  isExpanded: boolean;
  data: TimelineRepetition;
}) => {
  const { actionResult } = data;
  const styles = useMonitoringTimelineStyles();
  const nodeId = useMemo(() => actionResult.name ?? '', [actionResult]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selected, nodeId]);

  const nodeText = useMemo(() => idDisplayCase(nodeId), [nodeId]);

  return (
    <div ref={ref} className={styles.timelineNode} onClick={onSelect}>
      {selected && <div className={styles.selectionBox} />}
      <ConnectorIcon size="30px" nodeId={nodeId} />
      {isExpanded && (
        <Text weight={'semibold'} style={{ flexGrow: 1, marginRight: '8px' }}>
          {nodeText}
        </Text>
      )}
      {isExpanded && equals(actionResult.status, 'failed') && (
        <Tooltip relationship="description" content={actionResult?.error?.code ?? ''} withArrow>
          <div className={styles.errorIcon}>
            <Failed />
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default TimelineNode;
