import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { changePanelNode } from '../../../core/state/panel/panelSlice';
import { useActionMetadata, useNodeDisplayName, useNodeMetadata } from '../../../core/state/workflow/workflowSelectors';
import { collapseGraphsToShowNode, setFocusNode } from '../../../core/state/workflow/workflowSlice';
import { Button, Text } from '@fluentui/react-components';

import { useDispatch } from 'react-redux';
import { useNodeSearchPanelStyles } from './nodeSearchPanelStyles';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';

export const NodeSearchCard = ({ node }: { node: string }) => {
  const dispatch = useDispatch();

  const styles = useNodeSearchPanelStyles();

  const displayName = useNodeDisplayName(node);
  const { iconUri } = useOperationVisuals(node);

  const metadata = useNodeMetadata(node);
  const operationData = useActionMetadata(node);

  const parentMetadata = useNodeMetadata(metadata?.parentNodeId || '');

  const isInvalidSubgraph = useMemo(() => {
    if (!metadata?.subgraphType) {
      return false;
    }
    if (metadata.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE || metadata.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT) {
      return false;
    }
    if (metadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION) {
      return Object.keys(parentMetadata?.handoffs ?? {}).includes(node);
    }
    return true;
  }, [node, metadata?.subgraphType, parentMetadata?.handoffs]);

  if (isInvalidSubgraph || operationData?.type === 'AgentHandoff') {
    return null;
  }

  return (
    <Button
      appearance="subtle"
      className={styles.nodeSearchCard}
      onClick={() => {
        dispatch(collapseGraphsToShowNode(node));
        dispatch(changePanelNode(node));
        // Delay focus to allow graph expansion to complete.
        // 100ms provides enough time for React Flow to re-render expanded nodes
        // and calculate positions without feeling sluggish to users.
        // This ensures CanvasFinder has accurate node positions for panning.
        setTimeout(() => {
          dispatch(setFocusNode(node));
        }, 100);
      }}
      icon={iconUri ? <img src={iconUri} alt={displayName} className={styles.actionIcon} /> : <div className={styles.actionIcon} />}
    >
      <Text className={styles.title}>{displayName}</Text>
    </Button>
  );
};
