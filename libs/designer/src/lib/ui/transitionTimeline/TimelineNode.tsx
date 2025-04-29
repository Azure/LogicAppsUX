import { Text } from '@fluentui/react-components';
import { idDisplayCase } from '@microsoft/logic-apps-shared';
import { useOperationVisuals } from '../../core/state/operation/operationSelector';
import { useEffect, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TimelineNode = ({ index, nodeId, selected, onSelect, expanded }: any) => {
  const { iconUri } = useOperationVisuals(nodeId);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      if (ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selected, nodeId]);

  return (
    <div ref={ref} className={'msla-timeline-node'} onClick={onSelect}>
      {selected && <div className={'selection-box'} />}
      <img
        title={idDisplayCase(nodeId)}
        src={iconUri}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '4px',
        }}
      />
      {expanded && (
        <Text weight={'semibold'} style={{ marginRight: '8px' }}>
          {idDisplayCase(nodeId)}
        </Text>
      )}
    </div>
  );
};

export default TimelineNode;
