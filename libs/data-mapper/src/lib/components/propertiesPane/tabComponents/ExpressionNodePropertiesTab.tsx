import type { SelectedExpressionNode } from '../../../models';

interface ExpressionNodePropertiesTabProps {
  currentNode: SelectedExpressionNode;
}

export const ExpressionNodePropertiesTab = (props: ExpressionNodePropertiesTabProps): JSX.Element => {
  const { currentNode } = props;

  return <div>Expression node properties content (for node type {currentNode.nodeType})</div>;
};
