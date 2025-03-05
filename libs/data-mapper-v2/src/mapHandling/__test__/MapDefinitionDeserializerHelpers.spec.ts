import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { MapDefinitionDeserializer } from '../MapDefinitionDeserializer';
import { convertSchemaToSchemaExtended, flattenSchemaIntoDictionary } from '../../utils/Schema.Utils';
import { DataMapSchema, MapDefinitionEntry, SchemaType } from '@microsoft/logic-apps-shared';
import { sourceMockSchema, targetMockSchema } from '../../__mocks__/schemas';
import { functionMock } from '../../models';
import { ConnectionDictionary, NodeConnection } from '../../models/Connection';
import { addReactFlowPrefix, addSourceReactFlowPrefix, addTargetReactFlowPrefix } from '../../utils/ReactFlow.Util';

describe('MapDefinitionDeserializerHelpers', () => {
  let simpleMap: MapDefinitionEntry = {};

  const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema as any as DataMapSchema);
  const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema as any as DataMapSchema);

  const targetFlattened = flattenSchemaIntoDictionary(extendedTarget, SchemaType.Target);

  describe('handleSingleValueOrFunction', () => {
    it('should return simple function', () => {
      const connectionDictionary: ConnectionDictionary = {};
      const sourceKey = '/ns0:Root/DirectTranslation/EmployeeName';
      const sourceKeyWithPrefix = addReactFlowPrefix(sourceKey, SchemaType.Source);
      const targetKey = '/ns0:Root/DataTranslation/EmployeeName';
      const targetKeyWithPrefix = addTargetReactFlowPrefix(targetKey);
      const key = `concat(${sourceKey})`;
      const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
      const targetSchemaNode = targetFlattened[targetKeyWithPrefix];
      mapDefinitionDeserializer.handleSingleValueOrFunction(key, undefined, targetSchemaNode, connectionDictionary);

      hasExpectedConnection(connectionDictionary, sourceKeyWithPrefix, 'Concat', 0);
      hasExpectedConnection(connectionDictionary, 'Concat', targetKeyWithPrefix);
    });

    it('should return direct access function', () => {
      const connectionDictionary: ConnectionDictionary = {};
      // concat(/ns0:Root/DirectTranslation/EmployeeName)
      const sourceKey = '/ns0:Root/LoopingWithIndex/WeatherReport[1]/@Pressure';
      const sourceKeyWithPrefix = addReactFlowPrefix(sourceKey, SchemaType.Source);
      const targetKey = '/ns0:Root/DataTranslation/EmployeeName';
      const targetKeyWithPrefix = addTargetReactFlowPrefix(targetKey);
      const key = `concat(${sourceKey})`;
      const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
      const targetSchemaNode = targetFlattened[targetKeyWithPrefix];
      mapDefinitionDeserializer.handleSingleValueOrFunction(key, undefined, targetSchemaNode, connectionDictionary);

      // inputs into directAccess
      hasExpectedConnection(connectionDictionary, 'directAccess', 'Concat', 0);

      // inputs into concat
      hasExpectedConnection(connectionDictionary, addSourceReactFlowPrefix('/ns0:Root/LoopingWithIndex/WeatherReport'), 'directAccess', 1);
      hasExpectedConnection(
        connectionDictionary,
        addSourceReactFlowPrefix('/ns0:Root/LoopingWithIndex/WeatherReport/@Pressure'),
        'directAccess',
        2
      );

      // inputs into target
      hasExpectedConnection(connectionDictionary, 'Concat', targetKeyWithPrefix);
    });
  });
});

const getConnectionForAnyKey = (connectionDictionary: ConnectionDictionary, key: string) => {
  let foundConnection = connectionDictionary[key];

  // function IDs contain extra guid, so can't use direct access
  if (!foundConnection) {
    const fullKey = Object.keys(connectionDictionary).find((keys) => keys.startsWith(key));
    if (fullKey) {
      foundConnection = connectionDictionary[fullKey];
    }
  }
  return foundConnection;
};

const hasExpectedConnection = (
  connectionDictionary: ConnectionDictionary,
  sourceKey: string,
  targetKey: string,
  inputIndex: number = -1
) => {
  let source = getConnectionForAnyKey(connectionDictionary, sourceKey);
  let target = getConnectionForAnyKey(connectionDictionary, targetKey);

  expect(source.outputs.some((o) => o.reactFlowKey.startsWith(targetKey))).toBeTruthy();

  if (inputIndex > -1) {
    expect((target.inputs[inputIndex] as NodeConnection).reactFlowKey.startsWith(sourceKey));
  }
};
