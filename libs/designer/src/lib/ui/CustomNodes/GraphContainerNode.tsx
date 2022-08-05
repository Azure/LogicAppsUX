import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { useActionMetadata, useIsLeafNode, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { DropZone } from '../connections/dropzone';
import { css } from '@fluentui/react';
import { GraphContainer } from '@microsoft/designer-ui';
import { memo } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GraphContainerNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const readOnly = useReadOnly();

  const selected = useIsNodeSelected(id);
  const actionMetadata = useActionMetadata(id);
  const nodeMetadata = useNodeMetadata(id);
  const isLeaf = useIsLeafNode(id);
  const showLeafComponents = !readOnly && actionMetadata?.type && isLeaf;
  const hasFooter = actionMetadata?.type.toLowerCase() === 'until';

  return (
    <>
      <div className={css('msla-graph-container-wrapper', hasFooter && 'has-footer')}>
        <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
        <GraphContainer selected={selected} />
        <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
      </div>
      {showLeafComponents && (
        <div className="edge-drop-zone-container">
          <DropZone graphId={nodeMetadata?.graphId ?? ''} parent={id} />
        </div>
      )}
    </>
  );
};
GraphContainerNode.displayName = 'GraphContainerNode';

export default memo(GraphContainerNode);
