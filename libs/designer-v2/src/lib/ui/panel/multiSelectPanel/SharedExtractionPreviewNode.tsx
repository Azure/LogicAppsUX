import { ActionNodeCard, AgentNodeCard, ConditionNodeCard, LoopNodeCard, TriggerNodeCard } from '@microsoft/designer-ui-v2';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useIntl } from 'react-intl';
import type { NodeOperation } from '../../../core/state/operation/operationMetadataSlice';
import { useConnectorName } from '../../../core/state/selectors/actionMetadataSelector';
import { getNodePresentation } from '../../../core/utils/graph';
import {
  getOperationNodeSubtitle,
  mapActionNodeStrings,
  mapAgentNodeStrings,
  mapConditionNodeStrings,
  mapLoopNodeStrings,
} from '../../CustomNodes/components/card/nodeUiStrings';
import { scopeNodeIcon } from '../../CustomNodes/components/card/operationNodeGlyphs';
import { getScopeModel } from '../../CustomNodes/components/card/scopeNodePresentation';
import { useOperationNodeIcon } from '../../CustomNodes/components/card/useOperationNodeIcon';
import type { SharedExtractionPreviewNode } from './workflowExtractionPreview';
import { useSharedPreviewStyles } from './sharedWorkflowExtractionPreview.styles';

export type SharedPreviewFlowNode = Node<{ node: SharedExtractionPreviewNode; domId: string }, 'sharedWorkflowPreview'>;

export const PreviewOperationCard = ({
  node,
  domId,
  connectorName,
}: { node: SharedExtractionPreviewNode; domId: string; connectorName?: string }) => {
  const intl = useIntl();
  const { type, kind } = node.operation;
  const glyph = useOperationNodeIcon(type, kind, node.iconUri);
  const { family } = getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, { operationType: type });
  const common = {
    id: domId,
    title: node.label,
    'data-node-id': node.id,
    handleAxis: 'vertical' as const,
    handles: false,
  };
  if (node.isTrigger) {
    return (
      <TriggerNodeCard
        {...common}
        icon={glyph.icon}
        selectedIcon={glyph.selectedIcon}
        strings={mapActionNodeStrings(intl)}
        subtitle={getOperationNodeSubtitle(intl, type, kind, connectorName, true, false)}
      />
    );
  }
  if (family === 'if' || family === 'switch') {
    return <ConditionNodeCard {...common} kind={family} strings={mapConditionNodeStrings(intl)} />;
  }
  if (family === 'loop') {
    const strings = mapLoopNodeStrings(intl, type);
    return <LoopNodeCard {...common} bodyPlacement="none" strings={strings} subtitle={strings.loop.foreach} />;
  }
  if (family === 'agent') {
    return <AgentNodeCard {...common} model={getScopeModel(node.operation)} strings={mapAgentNodeStrings(intl)} />;
  }
  return (
    <ActionNodeCard
      {...common}
      icon={family === 'scope' ? scopeNodeIcon : glyph.icon}
      selectedIcon={glyph.selectedIcon}
      strings={mapActionNodeStrings(intl)}
      subtitle={family === 'scope' ? undefined : getOperationNodeSubtitle(intl, type, kind, connectorName, false, false)}
    />
  );
};

const ConnectedPreviewCard = ({ data, info }: { data: SharedPreviewFlowNode['data']; info: NodeOperation }) => {
  const { result } = useConnectorName(info);
  return <PreviewOperationCard {...data} connectorName={typeof result === 'string' ? result : undefined} />;
};

export const SharedExtractionPreviewCard = ({ data }: NodeProps<SharedPreviewFlowNode>) => {
  const styles = useSharedPreviewStyles();
  return (
    <div data-preview-operation-id={data.node.id}>
      <Handle type="target" position={Position.Top} isConnectable={false} className={styles.handle} />
      {data.node.operationInfo ? <ConnectedPreviewCard data={data} info={data.node.operationInfo} /> : <PreviewOperationCard {...data} />}
      <Handle type="source" position={Position.Bottom} isConnectable={false} className={styles.handle} />
    </div>
  );
};
