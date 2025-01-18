/* eslint-disable @typescript-eslint/no-empty-function */
import { useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { GraphContainer } from '@microsoft/designer-ui';
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { css } from '@fluentui/react';

const PlaceholderNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const selected = useIsNodeSelectedInOperationPanel(id);

  return (
    <div
      className={css('msla-graph-container-wrapper')}
      style={{
        width: 100,
        height: 100,
      }}
    >
      <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
      <GraphContainer active={true} selected={selected} />
      <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
    </div>
  );
};

PlaceholderNode.displayName = 'PlaceholderNode';

export default memo(PlaceholderNode);
