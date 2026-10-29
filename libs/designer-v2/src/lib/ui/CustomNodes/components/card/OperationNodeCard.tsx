import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { getNodePresentation } from '../../../../core/utils/graph';
import { useSharedNodeUi } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { ActionCard } from './index';
import { SharedActionCard } from './SharedActionCard';
import type { SharedActionCardProps } from './SharedActionCard';

interface OperationNodeCardProps extends SharedActionCardProps {
  sharedPresentation?: boolean;
}

export const OperationNodeCard = ({ sharedPresentation, ...props }: OperationNodeCardProps) => {
  const sharedOption = useSharedNodeUi();
  return (sharedPresentation ?? getNodePresentation(WORKFLOW_NODE_TYPES.OPERATION_NODE, sharedOption).shared) ? (
    <SharedActionCard {...props} />
  ) : (
    <ActionCard {...props} />
  );
};
