import type { SelectedExpressionNode } from '../../../models';

interface ExpressionNodePropertiesTabProps {
  currentNode: SelectedExpressionNode;
}

export const ExpressionNodePropertiesTab = ({ currentNode }: ExpressionNodePropertiesTabProps): JSX.Element => {

  return <div>Expression node properties content (for node type {currentNode.nodeType})</div>;
};
