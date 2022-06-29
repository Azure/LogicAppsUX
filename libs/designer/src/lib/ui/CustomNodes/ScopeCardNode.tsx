import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { changePanelNode, expandPanel } from '../../core/state/panel/panelSlice';
import { useBrandColor, useIconUri, useActionMetadata, useOperationInfo } from '../../core/state/selectors/actionMetadataSelector';
import { useEdgesBySource } from '../../core/state/selectors/workflowNodeSelector';
import type { AppDispatch, RootState } from '../../core/store';
import { isLeafNodeFromEdges } from '../../core/utils/graph';
import { DropZone } from '../connections/dropzone';
import { labelCase } from '@microsoft-logic-apps/utils';
import { ScopeCard } from '@microsoft/designer-ui';
import { memo, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ScopeCardNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const scopeId = id.split('-#')[0];

  const node = useActionMetadata(scopeId);

  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const [{ isDragging }, drag, dragPreview] = useDrag(
    () => ({
      type: 'BOX',
      end: (item, monitor) => {
        const dropResult = monitor.getDropResult<{ parent: string; child: string }>();
        if (item && dropResult) {
          alert(`You dropped ${scopeId} between ${dropResult.parent} and  ${dropResult.child}!`);
        }
      },
      item: {
        id: scopeId,
      },
      canDrag: !readOnly,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [readOnly]
  );

  // const graph = useWorkflowNode(scopeId) as WorkflowNode;
  const selected = useIsNodeSelected(scopeId);
  const operationInfo = useOperationInfo(scopeId);
  const brandColor = useBrandColor(operationInfo);
  const iconUri = useIconUri(operationInfo);
  const edges = useEdgesBySource(id);

  const isPanelCollapsed = useSelector((state: RootState) => state.panel.collapsed);
  const nodeClick = useCallback(() => {
    if (isPanelCollapsed) {
      dispatch(expandPanel());
    }
    dispatch(changePanelNode(scopeId));
  }, [dispatch, scopeId, isPanelCollapsed]);

  if (!node) {
    return null;
  }

  const label = labelCase(scopeId);

  const isEmpty = isLeafNodeFromEdges(edges);
  const isFooter = id.endsWith('#footer');
  const showEmptyGraphComponents = isEmpty && !isFooter;

  const normalizedType = node.type.toLowerCase();
  const implementedGraphTypes = ['if', 'switch', 'foreach', 'scope', 'until'];
  if (implementedGraphTypes.includes(normalizedType)) {
    return (
      <>
        <div className="msla-scope-card">
          <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
          <ScopeCard
            brandColor={brandColor.result}
            icon={iconUri.result}
            isLoading={iconUri.isLoading}
            collapsed={false}
            drag={drag}
            draggable={!readOnly}
            dragPreview={dragPreview}
            isDragging={isDragging}
            id={scopeId}
            isMonitoringView={isMonitoringView}
            title={label}
            readOnly={readOnly}
            onClick={nodeClick}
            selected={selected}
          />
          <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
        </div>
        {showEmptyGraphComponents ? (
          !readOnly ? (
            <div className={'edge-drop-zone-container'}>
              <DropZone graphId={scopeId} parent={scopeId} />
            </div>
          ) : (
            <p className="no-actions-text">No Actions</p>
          )
        ) : null}
      </>
    );
  } else {
    return <h1>{'GENERIC'}</h1>;
  }
};

ScopeCardNode.displayName = 'ScopeNode';

export default memo(ScopeCardNode);
