import { NodeType } from '../../../models';
import type { SelectedNode } from '../../../models';

interface SchemaNodePropertiesTabProps {
  currentNode: SelectedNode;
}

export const SchemaNodePropertiesTab = (props: SchemaNodePropertiesTabProps): JSX.Element => {
  const { currentNode } = props;

  // Base info shared by input/output nodes
  const NodeInfo = () => {
    return <div>Node info (name/path/type)</div>;
  };

  const AdditionalOutputNodeProperties = () => {
    return <div>Additonal output node properties</div>;
  };

  return (
    <div>
      <NodeInfo />

      {currentNode.type === NodeType.Output && <AdditionalOutputNodeProperties />}
    </div>
  );
};
