import type { SelectedNode } from '../../../models';

interface ExpressionNodePropertiesTabProps {
  currentNode: SelectedNode;
}

export const ExpressionNodePropertiesTab = (props: ExpressionNodePropertiesTabProps): JSX.Element => {
  const { currentNode } = props;

  return <div>Expression node properties content (for node type {currentNode.type})</div>;
};
