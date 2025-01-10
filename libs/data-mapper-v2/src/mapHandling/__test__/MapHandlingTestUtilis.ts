import { SchemaNodeExtended, SchemaType } from '@microsoft/logic-apps-shared';
import { ConnectionDictionary } from '../../models/Connection';
import { applyConnectionValue, createNodeConnection } from '../../utils/Connection.Utils';
import { addReactFlowPrefix } from '../../utils/ReactFlow.Util';

export const createSchemaToSchemaNodeConnection = (
  connections: ConnectionDictionary,
  sourceNode: SchemaNodeExtended,
  targetNode: SchemaNodeExtended
) => {
  applyConnectionValue(connections, {
    targetNode: targetNode,
    targetNodeReactFlowKey: addReactFlowPrefix(targetNode.key, SchemaType.Target),
    findInputSlot: true,
    input: createNodeConnection(sourceNode, addReactFlowPrefix(sourceNode.key, SchemaType.Source)),
  });
};
