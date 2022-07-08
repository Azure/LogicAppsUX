import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { changePanelNode, expandPanel } from '../../core/state/panel/panelSlice';
import {
  useBrandColor,
  useIconUri,
  useActionMetadata,
  useOperationInfo,
  useNodeMetadata,
} from '../../core/state/selectors/actionMetadataSelector';
import { useEdgesBySource, useIsGraphCollapsed } from '../../core/state/workflow/workflowSelectors';
import { toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import type { AppDispatch, RootState } from '../../core/store';
import { isLeafNodeFromEdges } from '../../core/utils/graph';
import { DropZone } from '../connections/dropzone';
import { labelCase } from '@microsoft-logic-apps/utils';
import { ScopeCard } from '@microsoft/designer-ui';
import { memo, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { Handle, Position } from 'react-flow-renderer';
import type { NodeProps } from 'react-flow-renderer';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ScopeCardNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const scopeId = id.split('-#')[0];

  const node = useActionMetadata(scopeId);

  const intl = useIntl();
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
  const metadata = useNodeMetadata(scopeId);
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

  const graphCollapsed = useIsGraphCollapsed(scopeId);
  const handleGraphCollapse = useCallback(() => {
    dispatch(toggleCollapsedGraphId(scopeId));
  }, [dispatch, scopeId]);

  if (!node) {
    return null;
  }

  const label = labelCase(scopeId);

  const normalizedType = node.type.toLowerCase();
  const actionCount = metadata?.actionCount ?? 0;

  const actionString = intl.formatMessage(
    {
      defaultMessage: '{actionCount, plural, one {# Action} =0 {0 Actions} other {# Actions}}',
      description: 'This is the number of actions to be completed in a group',
    },
    { actionCount }
  );

  const caseString = intl.formatMessage(
    {
      defaultMessage: '{actionCount, plural, one {# Case} =0 {0 Cases} other {# Cases}}',
      description: 'This is the number of cases or options the program can take',
    },
    { actionCount }
  );

  const collapsedText = normalizedType === 'switch' || normalizedType === 'if' ? caseString : actionString;

  const isEmpty = isLeafNodeFromEdges(edges);
  const isFooter = id.endsWith('#footer');
  const showEmptyGraphComponents = isEmpty && !graphCollapsed && !isFooter;

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
            collapsed={graphCollapsed}
            handleCollapse={handleGraphCollapse}
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
        {graphCollapsed && !isFooter ? <p className="no-actions-text">{collapsedText}</p> : null}
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
