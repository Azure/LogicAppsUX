import { NormalizedDataType, SchemaNodeDataType, SchemaNodeProperties } from '../../models';
import type { SchemaNodeExtended } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import { functionMock } from '../../models/Function';
import type { FunctionData } from '../../models/Function';
import { createConnectionEntryIfNeeded } from '../Connection.Utils';

describe('utils/Connections', () => {
  describe('createConnectionEntryIfNeeded', () => {
    const connections: ConnectionDictionary = {};

    it('Test new entry for SchemaNodeExtended is created with proper input placeholder', () => {
      const schemaNodeKey = 'schemaNodeTestKey';
      const schemaNode: SchemaNodeExtended = {
        key: '',
        name: '',
        fullName: '',
        schemaNodeDataType: SchemaNodeDataType.Integer,
        normalizedDataType: NormalizedDataType.Integer,
        properties: SchemaNodeProperties.NotSpecified,
        children: [],
        pathToRoot: [],
      };

      createConnectionEntryIfNeeded(connections, schemaNode, schemaNodeKey);

      expect(connections[schemaNodeKey].self.reactFlowKey).toEqual(schemaNodeKey);
      expect(connections[schemaNodeKey].self.node).toEqual(schemaNode);

      expect(Object.values(connections[schemaNodeKey].inputs).length).toEqual(1);
      expect(connections[schemaNodeKey].inputs[0]).toEqual([]);
    });

    it('Test new entry for Function is created with proper input placeholders', () => {
      const fnNodeKey = 'functionTestKey';
      const functionNode: FunctionData = functionMock.find((fn) => fn.key === 'Maximum') ?? functionMock[0];

      createConnectionEntryIfNeeded(connections, functionNode, fnNodeKey);

      expect(connections[fnNodeKey].self.reactFlowKey).toEqual(fnNodeKey);
      expect(connections[fnNodeKey].self.node).toEqual(functionNode);

      expect(Object.values(connections[fnNodeKey].inputs).length).toEqual(functionNode.inputs.length);
    });
  });
});
