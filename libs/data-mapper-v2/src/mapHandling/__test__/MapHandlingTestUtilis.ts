import { SchemaNodeExtended, SchemaType } from '@microsoft/logic-apps-shared';
import { ConnectionDictionary, InputConnection } from '../../models/Connection';
import { applyConnectionValue, createNodeConnection, isCustomValueConnection } from '../../utils/Connection.Utils';
import { addReactFlowPrefix } from '../../utils/ReactFlow.Util';
import { expect } from 'vitest';

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

export const isEqualToCustomValue = (value: string, customConnection: InputConnection) => {
  expect(isCustomValueConnection(customConnection)).toBeTruthy();
  isCustomValueConnection(customConnection) && expect(customConnection.value).toEqual(value);
};
