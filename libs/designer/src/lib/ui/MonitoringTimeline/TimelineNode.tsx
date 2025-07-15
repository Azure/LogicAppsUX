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
  const styles = useMonitoringTimelineStyles();
  const nodeIds = useMemo(() => (data?.properties?.actions ? Object.keys(data.properties.actions) : []), [data]);
  const firstNodeId = useMemo(() => nodeIds?.[0] ?? '', [nodeIds]);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selected, firstNodeId]);

  const nodeText = useMemo(() => idDisplayCase(firstNodeId), [firstNodeId]);

  return (
    <div ref={ref} className={styles.timelineNode} onClick={onSelect}>
      {selected && <div className={styles.selectionBox} />}
      <ConnectorIcon size="30px" nodeId={firstNodeId} />
      {isExpanded && (
        <Text weight={'semibold'} style={{ flexGrow: 1, marginRight: '8px' }}>
          {nodeText}
        </Text>
      )}
      {isExpanded && equals(Object.values(data.properties?.actions ?? {})?.[0]?.status, 'failed') && (
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
