/* eslint-disable @typescript-eslint/no-empty-function */
import constants from '../../common/constants';
import { useOperationInfo, type AppDispatch } from '../../core';
import { initializeSubgraphFromManifest } from '../../core/actions/bjsworkflow/add';
import { getOperationManifest } from '../../core/queries/operation';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { setNodeContextMenuData, setShowDeleteModalNodeId } from '../../core/state/designerView/designerViewSlice';
import { useIconUri, useParameterValidationErrors } from '../../core/state/operation/operationSelector';
import { useIsNodePinnedToOperationPanel, useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { addAgentToolMetadata, changePanelNode, expandDiscoveryPanel } from '../../core/state/panel/panelSlice';
import {
  useActionMetadata,
  useIsGraphCollapsed,
  useIsLeafNode,
  useNewAdditiveSubgraphId,
  useNodeDisplayName,
  useNodeMetadata,
  useParentNodeId,
  useRunData,
  useWorkflowNode,
} from '../../core/state/workflow/workflowSelectors';
import { addSwitchCase, setFocusNode, toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import { LoopsPager } from '../common/LoopsPager/LoopsPager';
import { DropZone } from '../connections/dropzone';
import { MessageBarType } from '@fluentui/react';
import { SubgraphCard } from '@microsoft/designer-ui';
import { SUBGRAPH_TYPES, guid, isNullOrUndefined, removeIdTag, useNodeIndex } from '@microsoft/logic-apps-shared';
import { memo, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { DefaultHandle } from './handles/DefaultHandle';

const SubgraphCardNode = ({ id }: NodeProps) => {
  const subgraphId = removeIdTag(id);
  const node = useActionMetadata(subgraphId);

  const intl = useIntl();
  const readOnly = useReadOnly();
  const dispatch = useDispatch<AppDispatch>();

  const isPinned = useIsNodePinnedToOperationPanel(subgraphId);
  const selected = useIsNodeSelectedInOperationPanel(subgraphId);
  const isLeaf = useIsLeafNode(id);
  const metadata = useNodeMetadata(subgraphId);
  const graphId = useMemo(() => metadata?.graphId ?? '', [metadata]);
  const graphNode = useWorkflowNode(graphId);
  const operationInfo = useOperationInfo(graphId);
  const isMonitoringView = useMonitoringView();
  const normalizedType = node?.type.toLowerCase();
  const parentNodeId = useParentNodeId(subgraphId);
  const runData = useRunData(parentNodeId ?? subgraphId);
  const parentActionMetadata = useActionMetadata(parentNodeId);
  const isParentAgent = parentActionMetadata?.type?.toLowerCase() === constants.NODE.TYPE.AGENT;

  const title = useNodeDisplayName(subgraphId);

  const isSwitchAddCase = metadata?.subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE;
  const isAgentAddTool = metadata?.subgraphType === SUBGRAPH_TYPES.AGENT_ADD_CONDITON;

  const isAddCase = isSwitchAddCase || isAgentAddTool;
  const actionCount = metadata?.actionCount ?? 0;
  const iconUri = useIconUri(graphId);

  const stringResources = useMemo(
    () => ({
      TOOL: intl.formatMessage({
        defaultMessage: 'Tool',
        id: '3PXVj+',
        description: 'Label for the tool node',
      }),
      CASE: intl.formatMessage({
        defaultMessage: 'Case',
        id: 'GusLAj',
        description: 'Label for the case node',
      }),
      COLLAPSED_TEXT: intl.formatMessage(
        {
          defaultMessage: '{actionCount, plural, one {# Action} =0 {0 Actions} other {# Actions}}',
          id: 'B/JzwK',
          description: 'This is the number of actions to be completed in a group',
        },
        { actionCount }
      ),
      PARAMETER_VALIDATION_ERROR: intl.formatMessage({
        defaultMessage: 'Invalid parameters',
        id: 'Tmr/9e',
        description: 'Text to explain that there are invalid parameters for this node',
      }),
      NO_ACTIONS: intl.formatMessage({
        defaultMessage: 'No actions',
        id: 'CN+Jfd',
        description: 'Text to explain that there are no actions',
      }),
    }),
    [actionCount, intl]
  );

  const newAdditiveSubgraphId = useNewAdditiveSubgraphId(isAgentAddTool ? stringResources.TOOL : stringResources.CASE);
  const subgraphClick = useCallback(
    async (_id: string) => {
      if (isAddCase && graphNode) {
        if (isAgentAddTool) {
          const relationshipIds = {
            graphId,
            subgraphId: newAdditiveSubgraphId,
            parentId: `${newAdditiveSubgraphId}-#subgraph`,
          };
          dispatch(expandDiscoveryPanel({ nodeId: guid(), relationshipIds, isAgentTool: true }));
        } else {
          dispatch(addSwitchCase({ caseId: newAdditiveSubgraphId, graphId }));
        }

        const rootManifest = await getOperationManifest(operationInfo);
        if (!rootManifest?.properties?.subGraphDetails) {
          return;
        }
        const caseManifestData = Object.values(rootManifest.properties.subGraphDetails).find((data) => data.isAdditive);
        const subGraphManifest = {
          properties: { ...caseManifestData, iconUri: iconUri ?? '', brandColor: '' },
        };
        if (isAgentAddTool) {
          dispatch(addAgentToolMetadata({ newAdditiveSubgraphId, subGraphManifest }));
        } else {
          initializeSubgraphFromManifest(newAdditiveSubgraphId, subGraphManifest, dispatch);
          dispatch(changePanelNode(newAdditiveSubgraphId));
        }
        dispatch(setFocusNode(newAdditiveSubgraphId));
      } else {
        dispatch(changePanelNode(_id));
      }
    },
    [isAddCase, graphNode, isAgentAddTool, operationInfo, iconUri, dispatch, newAdditiveSubgraphId, graphId]
  );

  const graphCollapsed = useIsGraphCollapsed(subgraphId);
  const handleGraphCollapse = useCallback(
    (includeNested?: boolean) => {
      dispatch(toggleCollapsedGraphId({ id: subgraphId, includeNested }));
    },
    [dispatch, subgraphId]
  );

  const showEmptyGraphComponents = isLeaf && !graphCollapsed && !isAddCase;

  const deleteClick = useCallback(() => {
    dispatch(setShowDeleteModalNodeId(id));
  }, [dispatch, id]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(
        setNodeContextMenuData({
          nodeId: subgraphId,
          location: {
            x: e.clientX,
            y: e.clientY,
          },
        })
      );
    },
    [dispatch, subgraphId]
  );

  const parameterValidationErrors = useParameterValidationErrors(subgraphId);

  const { errorMessage, errorLevel } = useMemo(() => {
    if (parameterValidationErrors?.length > 0) {
      return { errorMessage: stringResources.PARAMETER_VALIDATION_ERROR, errorLevel: MessageBarType.severeWarning };
    }
    return { errorMessage: undefined, errorLevel: undefined };
  }, [parameterValidationErrors?.length, stringResources.PARAMETER_VALIDATION_ERROR]);

  const nodeIndex = useNodeIndex(subgraphId);
  const shouldShowPager =
    isMonitoringView && (normalizedType === constants.NODE.TYPE.UNTIL || (isParentAgent && (metadata?.runData?.repetitionCount ?? 0) > 1));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <DefaultHandle type="target" />
          {metadata?.subgraphType ? (
            <>
              <SubgraphCard
                id={subgraphId}
                active={isMonitoringView ? !isNullOrUndefined(runData?.status) : true}
                parentId={metadata?.graphId}
                subgraphType={metadata.subgraphType}
                title={title}
                selectionMode={selected ? 'selected' : isPinned ? 'pinned' : false}
                readOnly={readOnly}
                onClick={subgraphClick}
                onContextMenu={onContextMenu}
                onDeleteClick={deleteClick}
                collapsed={graphCollapsed}
                handleCollapse={handleGraphCollapse}
                errorLevel={errorLevel}
                errorMessage={errorMessage}
                nodeIndex={nodeIndex}
              />
              {shouldShowPager ? <LoopsPager metadata={metadata} scopeId={subgraphId} collapsed={graphCollapsed} /> : null}
            </>
          ) : null}
          <DefaultHandle type="source" />
        </div>
      </div>
      {graphCollapsed ? (
        <p className="no-actions-text" data-automation-id={`subgraph-${id}-no-actions`}>
          {stringResources.COLLAPSED_TEXT}
        </p>
      ) : null}
      {showEmptyGraphComponents ? (
        readOnly ? (
          <p className="no-actions-text">{stringResources.NO_ACTIONS}</p>
        ) : (
          <div className={'edge-drop-zone-container'}>
            <DropZone graphId={subgraphId} parentId={id} isLeaf={isLeaf} tabIndex={nodeIndex} />
          </div>
        )
      ) : null}
    </div>
  );
};

SubgraphCardNode.displayName = 'SubgraphCardNode';

export default memo(SubgraphCardNode);
