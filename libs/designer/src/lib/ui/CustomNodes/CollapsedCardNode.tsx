import { CollapsedCard } from '@microsoft/designer-ui';
import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { setNodeContextMenuData } from '../../core/state/designerView/designerViewSlice';
import type { AppDispatch } from '../../core';
import { useDispatch } from 'react-redux';
import { DropZone } from '../connections/dropzone';
import { useIsLeafNode, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useNodeIndex } from '@microsoft/logic-apps-shared';

const CollapsedNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const isLeaf = useIsLeafNode(id);
  const showLeafComponents = useMemo(() => !readOnly && isLeaf, [readOnly, isLeaf]);
  const metadata = useNodeMetadata(id);
  const nodeIndex = useNodeIndex(id);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(
        setNodeContextMenuData({
          nodeId: id,
          location: {
            x: e.clientX,
            y: e.clientY,
          },
        })
      );
    },
    [dispatch, id]
  );

  const actionCount = 4;

  return (
    <div
      style={{
        width: 200,
        height: 75,
      }}
    >
      <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
      <CollapsedCard id="testId" onContextMenu={onContextMenu} actionCount={actionCount} />
      <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
      {showLeafComponents ? (
        <div className={'edge-drop-zone-container'}>
          <DropZone graphId={metadata?.graphId ?? ''} parentId={id} isLeaf={isLeaf} tabIndex={nodeIndex} />
        </div>
      ) : null}
    </div>
  );
};

CollapsedNode.displayName = 'CollapsedNode';

export default memo(CollapsedNode);
