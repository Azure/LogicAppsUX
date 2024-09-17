import type { NodeProps, Node } from '@xyflow/react';
import type { StringIndexed } from '@microsoft/logic-apps-shared';
import { SchemaPanel } from '../../../schema/SchemaPanel';
import type { SchemaFile } from '../../../../models/Schema';

type SchemaPanelNodeReactFlowDataProps = {};

const SchemaPanelNode = (props: NodeProps<Node<StringIndexed<SchemaPanelNodeReactFlowDataProps>, 'schemaPanel'>>) => {
  const { id } = props;
  return <SchemaPanel onSubmitSchemaFileSelection={(schema: SchemaFile) => console.log(schema)} id={id} />;
};

export default SchemaPanelNode;
