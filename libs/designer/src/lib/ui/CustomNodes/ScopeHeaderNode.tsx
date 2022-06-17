import { changePanelNode, expandPanel } from '../../core/state/panelSlice';
import { useBrandColor, useIconUri, useActionMetadata, useOperationInfo } from '../../core/state/selectors/actionMetadataSelector';
import { useMonitoringView, useReadOnly } from '../../core/state/selectors/designerOptionsSelector';
import type { AppDispatch, RootState } from '../../core/store';
import { ScopeHeaderCard } from '@microsoft/designer-ui';
import { memo, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ScopeHeaderNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const scopeId = id.replace('-scope', '');

  const node = useActionMetadata(scopeId);

  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const [{ isDragging }, drag, dragPreview] = useDrag(
    () => ({
      // "type" is required. It is used by the "accept" specification of drop targets.
      type: 'BOX',
      // The collect function utilizes a "monitor" instance (see the Overview for what this is)
      // to pull important pieces of state from the DnD system.
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
  const isCollapsed = useSelector((state: RootState) => state.panel.collapsed);
  // const graph = useWorkflowNode(scopeId) as WorkflowNode;
  const operationInfo = useOperationInfo(scopeId);
  const brandColor = useBrandColor(operationInfo);
  const iconUri = useIconUri(operationInfo);
  const dispatch = useDispatch<AppDispatch>();
  const nodeClick = useCallback(() => {
    if (isCollapsed) {
      dispatch(expandPanel());
    }
    dispatch(changePanelNode(scopeId));
  }, [dispatch, scopeId, isCollapsed]);

  if (!node) {
    return null;
  }

  const normalizedType = node.type.toLowerCase();

  const implementedGraphTypes = ['if', 'switch', 'foreach', 'scope'];
  if (implementedGraphTypes.includes(normalizedType)) {
    return (
      <div className="msla-scope-card">
        <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
        <ScopeHeaderCard
          brandColor={brandColor}
          icon={iconUri}
          collapsed={false}
          drag={drag}
          draggable={!readOnly}
          dragPreview={dragPreview}
          isDragging={isDragging}
          id={scopeId}
          isMonitoringView={isMonitoringView}
          title={scopeId}
          readOnly={readOnly}
          onClick={nodeClick}
        />
        <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
      </div>
    );
  } else {
    return <h1>{'GENERIC'}</h1>;
  }
};

ScopeHeaderNode.displayName = 'ScopeNode';

export default memo(ScopeHeaderNode);
