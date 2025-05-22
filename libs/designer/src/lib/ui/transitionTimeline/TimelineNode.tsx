import { Badge, Text, Tooltip } from '@fluentui/react-components';
import { equals, idDisplayCase } from '@microsoft/logic-apps-shared';
import { useEffect, useMemo, useRef } from 'react';
import { useActionTransitionRepetitionCount } from '../../core/state/workflow/workflowSelectors';
import type { TransitionRepetition } from './hooks';
import { ConnectorIcon } from './ConnectorIcon';
import { Failed } from '@microsoft/designer-ui';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  data: TransitionRepetition;
}) => {
  const nodeIds = useMemo(() => (data?.properties?.actions ? Object.keys(data.properties.actions) : []), [data]);
  const firstNodeId = useMemo(() => nodeIds?.[0] ?? '', [nodeIds]);

  const ref = useRef<HTMLDivElement>(null);

  const actionRepetitionCount = useActionTransitionRepetitionCount(firstNodeId, index);

  const actionCount = useMemo(() => {
    return Object.keys(data?.properties?.actions ?? {}).length;
  }, [data]);

  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selected, firstNodeId]);

  const nodeText = useMemo(() => {
    if (actionCount === 1) {
      return idDisplayCase(firstNodeId);
    }
    return `${actionCount} Actions`;
  }, [actionCount, firstNodeId]);

  return (
    <div ref={ref} className={'msla-timeline-node'} onClick={onSelect}>
      {selected && <div className={'selection-box'} />}
      {actionCount === 1 ? (
        <ConnectorIcon nodeId={firstNodeId} />
      ) : (
        // <Badge appearance="tint" shape="rounded" size="large" style={{
        // 	width: '32px',
        // 	height: '32px',
        // 	borderRadius: '4px',
        // }}>
        // 		{actionCount}
        // </Badge>
        <div
          style={{
            width: '32px',
            height: '32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '2px',
          }}
        >
          {nodeIds?.[0] && <ConnectorIcon nodeId={nodeIds[0]} size={'15px'} />}
          {nodeIds?.[1] && <ConnectorIcon nodeId={nodeIds[1]} size={'15px'} />}
          {nodeIds?.[2] && <ConnectorIcon nodeId={nodeIds[2]} size={'15px'} />}
          {actionCount > 3 && (
            <Badge
              size="small"
              appearance="tint"
              style={{
                width: '15px',
                height: '15px',
                padding: '0px 0px 1px 0px',
                borderRadius: '4px',
              }}
            >
              +{actionCount - 3}
            </Badge>
          )}
        </div>
      )}
      {actionCount === 1 && actionRepetitionCount > 1 && (
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
          <div className="msla-run-after-label-badge" style={{ zIndex: 1000, marginRight: '8px' }}>
            <Failed />
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default TimelineNode;
