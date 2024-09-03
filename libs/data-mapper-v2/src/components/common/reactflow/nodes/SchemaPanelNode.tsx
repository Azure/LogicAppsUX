import type { NodeProps, Node } from '@xyflow/react';
import { SchemaType, type StringIndexed } from '@microsoft/logic-apps-shared';
import { SchemaPanel } from '../../../schema/SchemaPanel';
import type { SchemaFile } from '../../../../models/Schema';
import { isSourceNode } from '../../../../utils/ReactFlow.Util';

type SchemaPanelNodeReactFlowDataProps = {};

const SchemaPanelNode = (props: NodeProps<Node<StringIndexed<SchemaPanelNodeReactFlowDataProps>, 'schemaPanel'>>) => {
  const { id } = props;
  return (
    <SchemaPanel
      onSubmitSchemaFileSelection={(schema: SchemaFile) => console.log(schema)}
      schemaType={isSourceNode(id) ? SchemaType.Source : SchemaType.Target}
    />
  );
};

export default SchemaPanelNode;
