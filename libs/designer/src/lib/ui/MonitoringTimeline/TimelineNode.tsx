import { Badge, Text, Tooltip } from '@fluentui/react-components';
import { equals, idDisplayCase } from '@microsoft/logic-apps-shared';
import { useEffect, useMemo, useRef } from 'react';
import { useActionTimelineRepetitionCount } from '../../core/state/workflow/workflowSelectors';
import type { TimelineRepetition } from './hooks';
import { ConnectorIcon } from './ConnectorIcon';
import { Failed } from '@microsoft/designer-ui';
import { useMonitoringTimelineStyles } from './monitoringTimeline.styles';

const TimelineNode = ({
  index,
  selected,
  onSelect,
  expanded,
  data,
}: {
  index: number;
  selected: boolean;
  onSelect: () => void;
  expanded: boolean;
  data: TimelineRepetition;
}) => {
  const styles = useMonitoringTimelineStyles();
  const nodeIds = useMemo(() => (data?.properties?.actions ? Object.keys(data.properties.actions) : []), [data]);
  const firstNodeId = useMemo(() => nodeIds?.[0] ?? '', [nodeIds]);

  const ref = useRef<HTMLDivElement>(null);

  const actionRepetitionCount = useActionTimelineRepetitionCount(firstNodeId, index);

  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selected, firstNodeId]);

  const nodeText = useMemo(() => idDisplayCase(firstNodeId), [firstNodeId]);

  return (
    <div ref={ref} className={styles.timelineNode} onClick={onSelect}>
      {selected && <div className={styles.selectionBox} />}
      <ConnectorIcon nodeId={firstNodeId} />
      {actionRepetitionCount > 1 && (
        <Badge
          shape="rounded"
          size="small"
          style={{
            position: 'absolute',
            bottom: '0px',
            left: '0px',
          }}
        >
          #{actionRepetitionCount}
        </Badge>
      )}
      {expanded && (
        <Text weight={'semibold'} style={{ flexGrow: 1, marginRight: '8px' }}>
          {nodeText}
        </Text>
      )}
      {expanded && equals(Object.values(data.properties?.actions ?? {})?.[0]?.status, 'failed') && (
        <Tooltip relationship="description" content={Object.values(data.properties?.actions ?? {})?.[0]?.error?.code ?? ''} withArrow>
          <div className={styles.errorIcon}>
            <Failed />
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default TimelineNode;
