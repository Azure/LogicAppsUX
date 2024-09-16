import { type AppDispatch, useNodeMetadata } from '../../../core';
import { LogEntryLevel, LoggerService, removeIdTag } from '@microsoft/logic-apps-shared';
import { type ReactElement, useCallback, useMemo } from 'react';
import { retrieveClipboardData } from '../../../core/utils/clipboard';
import { pasteOperation, pasteScopeOperation } from '../../../core/actions/bjsworkflow/copypaste';
import { useEdgeContextMenuData } from '../../../core/state/designerView/designerViewSelectors';
import { useUpstreamNodes } from '../../../core/state/tokens/tokenSelectors';
import { useDispatch } from 'react-redux';

interface PasteOperationProps {
  location: string;
  isParallelBranch?: boolean;
  children: ReactElement;
}

export const PasteOperation = ({ location, isParallelBranch = false, children: Child }: PasteOperationProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const menuData = useEdgeContextMenuData();
  const graphId = useMemo(() => menuData?.graphId, [menuData]);
  const parentId = useMemo(() => menuData?.parentId, [menuData]);
  const childId = useMemo(() => menuData?.childId, [menuData]);
  const nodeMetadata = useNodeMetadata(removeIdTag(parentId ?? ''));

  // For subgraph nodes, we want to use the id of the scope node as the parentId to get the dependancies
  const newParentId = useMemo(() => {
    if (nodeMetadata?.subgraphType) {
      return nodeMetadata.parentNodeId;
    }
    return parentId;
  }, [nodeMetadata, parentId]);

  const upstreamNodesOfChild = useUpstreamNodes(removeIdTag(childId ?? newParentId ?? graphId ?? ''));

  const handlePasteClicked = useCallback(async () => {
    if (!graphId) {
      return;
    }
    const relationshipIds = { graphId, childId, parentId };
    const copiedNode = await retrieveClipboardData();
    if (!copiedNode) {
      return;
    }
    if (copiedNode?.isScopeNode) {
      dispatch(
        pasteScopeOperation({
          relationshipIds,
          nodeId: copiedNode.nodeId,
          serializedValue: copiedNode.serializedOperation,
          allConnectionData: copiedNode.allConnectionData,
          staticResults: copiedNode.staticResults,
          upstreamNodeIds: upstreamNodesOfChild,
        })
      );
    } else {
      dispatch(
        pasteOperation({
          relationshipIds,
          nodeId: copiedNode.nodeId,
          nodeData: copiedNode.nodeData,
          nodeTokenData: copiedNode.nodeTokenData,
          operationInfo: copiedNode.nodeOperationInfo,
          connectionData: copiedNode.nodeConnectionData,
          comment: copiedNode.nodeComment,
          isParallelBranch,
        })
      );
    }
    LoggerService().log({
      area: `${location}:handlePasteClicked`,
      level: LogEntryLevel.Verbose,
      message: 'New node added via paste.',
    });
  }, [location, graphId, childId, parentId, dispatch, upstreamNodesOfChild]);

  return <Child.type {...Child.props} onClick={handlePasteClicked} />;
};
