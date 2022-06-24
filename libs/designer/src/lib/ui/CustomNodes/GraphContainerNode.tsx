import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { useActionMetadata } from '../../core/state/selectors/actionMetadataSelector';
import { useEdgesByParent } from '../../core/state/selectors/workflowNodeSelector';
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
  const childEdges = useEdgesByParent(id);
  const showAddButton = !readOnly && actionMetadata?.type && childEdges.length === 0;

  const hasFooter = actionMetadata?.type.toLowerCase() === 'until';

  return (
    <>
      <div className={css('msla-graph-container-wrapper', hasFooter && 'has-footer')}>
        <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
        <GraphContainer selected={selected} />
        <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
      </div>
      {showAddButton && (
        <div className="edge-drop-zone-container">
          <DropZone graphId={id} parent={id} />
        </div>
      )}
    </>
  );
};
GraphContainerNode.displayName = 'GraphContainerNode';

export default memo(GraphContainerNode);
