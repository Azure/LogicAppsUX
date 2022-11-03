import { sourceMockSchema, targetMockSchema } from '../__mocks__';
import { concatFunction, greaterThanFunction } from '../__mocks__/FunctionMock';
import type { MapDefinitionEntry, Schema, SchemaExtended, SchemaNodeExtended } from '../models';
import { SchemaType } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { ifPseudoFunction, indexPseudoFunction } from '../models/Function';
import { addNodeToConnections } from '../utils/Connection.Utils';
import { generateMapDefinitionBody, generateMapDefinitionHeader, splitKeyIntoChildren } from '../utils/DataMap.Utils';
import { addReactFlowPrefix, createReactFlowFunctionKey } from '../utils/ReactFlow.Util';
import { convertSchemaToSchemaExtended } from '../utils/Schema.Utils';

// TODO attribute $value

describe('Map definition conversions', () => {
  describe('generateMapDefinitionHeader', () => {
    const sourceSchema: Schema = sourceMockSchema;
    const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);

    const targetSchema: Schema = targetMockSchema;
    const extendedTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(targetSchema);

    it('Generates header', async () => {
      const mapDefinition: MapDefinitionEntry = {};
      generateMapDefinitionHeader(mapDefinition, extendedSourceSchema, extendedTargetSchema);

      expect(Object.keys(mapDefinition).length).toEqual(7);
    });
  });

  describe('generateMapDefinitionBody', () => {
    const sourceSchema: Schema = sourceMockSchema;
    const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);

    const targetSchema: Schema = targetMockSchema;
    const extendedTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(targetSchema);

    it('Generates body with passthrough', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children[0];
      const targetNode = extendedTargetSchema.schemaTreeRoot.children[0];
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      addNodeToConnections(
        connections,
        sourceNode.children[0],
        addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
        targetNode.children[0].children[0],
        addReactFlowPrefix(targetNode.children[0].children[0].key, SchemaType.Target)
      );

      addNodeToConnections(
        connections,
        sourceNode.children[1],
        addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source),
        targetNode.children[0].children[1],
        addReactFlowPrefix(targetNode.children[0].children[1].key, SchemaType.Target)
      );
      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('DirectTranslation');
      expect(rootChildren[0][1]).not.toBe('string');

      const directTranslationObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['DirectTranslation'] as MapDefinitionEntry;
      const directTranslationChildren = Object.entries(directTranslationObject);
      expect(directTranslationChildren.length).toEqual(1);
      expect(directTranslationChildren[0][0]).toEqual('Employee');
      expect(directTranslationChildren[0][1]).not.toBe('string');

      const employeeObject = directTranslationObject['Employee'] as MapDefinitionEntry;
      const employeeChildren = Object.entries(employeeObject);
      expect(employeeChildren.length).toEqual(2);
      expect(employeeChildren[0][0]).toEqual('ID');
      expect(employeeChildren[0][1]).toEqual('/ns0:Root/DirectTranslation/EmployeeID');
      expect(employeeChildren[1][0]).toEqual('Name');
      expect(employeeChildren[1][1]).toEqual('/ns0:Root/DirectTranslation/EmployeeName');
    });

    it('Generates body with function', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children[0];
      const targetNode = extendedTargetSchema.schemaTreeRoot.children[0];
      const concatFunctionId = createReactFlowFunctionKey(concatFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      addNodeToConnections(
        connections,
        sourceNode.children[0],
        addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
        concatFunction,
        concatFunctionId
      );
      addNodeToConnections(
        connections,
        sourceNode.children[1],
        addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source),
        concatFunction,
        concatFunctionId
      );
      addNodeToConnections(
        connections,
        concatFunction,
        concatFunctionId,
        targetNode.children[0].children[0],
        addReactFlowPrefix(targetNode.children[0].children[0].key, SchemaType.Target)
      );

      addNodeToConnections(
        connections,
        sourceNode.children[1],
        addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source),
        targetNode.children[0].children[1],
        addReactFlowPrefix(targetNode.children[0].children[1].key, SchemaType.Target)
      );

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('DirectTranslation');
      expect(rootChildren[0][1]).not.toBe('string');

      const directTranslationObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['DirectTranslation'] as MapDefinitionEntry;
      const directTranslationChildren = Object.entries(directTranslationObject);
      expect(directTranslationChildren.length).toEqual(1);
      expect(directTranslationChildren[0][0]).toEqual('Employee');
      expect(directTranslationChildren[0][1]).not.toBe('string');

      const employeeObject = directTranslationObject['Employee'] as MapDefinitionEntry;
      const employeeChildren = Object.entries(employeeObject);
      expect(employeeChildren.length).toEqual(2);
      expect(employeeChildren[0][0]).toEqual('ID');
      expect(employeeChildren[0][1]).toEqual('concat(/ns0:Root/DirectTranslation/EmployeeID, /ns0:Root/DirectTranslation/EmployeeName)');
      expect(employeeChildren[1][0]).toEqual('Name');
      expect(employeeChildren[1][1]).toEqual('/ns0:Root/DirectTranslation/EmployeeName');
    });

    it('Generates body with conditional', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children[3];
      const targetNode = extendedTargetSchema.schemaTreeRoot.children[4];
      const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
      const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Source to greater than
      addNodeToConnections(
        connections,
        sourceNode.children[0],
        addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
        greaterThanFunction,
        greaterThanId
      );
      addNodeToConnections(
        connections,
        sourceNode.children[1],
        addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source),
        greaterThanFunction,
        greaterThanId
      );

      // Inputs to conditional
      addNodeToConnections(connections, greaterThanFunction, greaterThanId, ifPseudoFunction, ifFunctionId);
      addNodeToConnections(
        connections,
        sourceNode.children[0],
        addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
        ifPseudoFunction,
        ifFunctionId
      );

      //Conditional to target
      addNodeToConnections(
        connections,
        ifPseudoFunction,
        ifFunctionId,
        targetNode.children[0],
        addReactFlowPrefix(targetNode.children[0].key, SchemaType.Target)
      );

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('ConditionalMapping');
      expect(rootChildren[0][1]).not.toBe('string');

      const conditionalMappingObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['ConditionalMapping'] as MapDefinitionEntry;
      const conditionalMappingChildren = Object.entries(conditionalMappingObject);
      expect(conditionalMappingChildren.length).toEqual(1);
      expect(conditionalMappingChildren[0][0]).toEqual(
        '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity))'
      );
      expect(conditionalMappingChildren[0][1]).not.toBe('string');

      const ifObject = conditionalMappingObject[
        '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity))'
      ] as MapDefinitionEntry;
      const ifChildren = Object.entries(ifObject);
      expect(ifChildren.length).toEqual(1);
      expect(ifChildren[0][0]).toEqual('ItemPrice');
      expect(ifChildren[0][1]).toEqual('/ns0:Root/ConditionalMapping/ItemPrice');
    });

    it('Generates body with loop', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
      const targetNode = extendedTargetSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Just confirm the mock hasn't changed
      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      const sourceChildNode = sourceNode.children[0];
      const targetChildNode = targetNode.children[0];

      addNodeToConnections(
        connections,
        sourceChildNode.children[0],
        addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
        targetChildNode.children[1],
        addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target)
      );

      //Add parents
      addNodeToConnections(
        connections,
        sourceChildNode,
        addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
        targetChildNode,
        addReactFlowPrefix(targetChildNode.key, SchemaType.Target)
      );

      addNodeToConnections(
        connections,
        sourceChildNode.children[1],
        addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source),
        targetChildNode.children[0],
        addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target)
      );
      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('Looping');
      expect(rootChildren[0][1]).not.toBe('string');

      const loopObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['Looping'] as MapDefinitionEntry;
      const loopingEntries = Object.entries(loopObject);
      expect(loopingEntries.length).toEqual(1);
      expect(loopingEntries[0][0]).toEqual('$for(/ns0:Root/Looping/Employee)');
      expect(loopingEntries[0][1]).not.toBe('string');

      const employeeForObject = loopObject['$for(/ns0:Root/Looping/Employee)'] as MapDefinitionEntry;
      const employeeForLoopEntries = Object.entries(employeeForObject);
      expect(employeeForLoopEntries.length).toEqual(1);
      expect(employeeForLoopEntries[0][0]).toEqual('Person');
      expect(employeeForLoopEntries[0][1]).not.toBe('string');

      const employeeObject = employeeForObject['Person'] as MapDefinitionEntry;
      const employeeObjectEntries = Object.entries(employeeObject);
      expect(employeeObjectEntries.length).toEqual(2);
      expect(employeeObjectEntries[0][0]).toEqual('Address');
      expect(employeeObjectEntries[0][1]).toEqual('TelephoneNumber');
      expect(employeeObjectEntries[1][0]).toEqual('Name');
      expect(employeeObjectEntries[1][1]).toEqual('Name');
    });

    it('Generates body with child objects loop', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find(
        (child) => child.name === 'LoopingWithIndex'
      ) as SchemaNodeExtended;
      const targetNode = extendedTargetSchema.schemaTreeRoot.children.find(
        (child) => child.name === 'LoopingWithIndex'
      ) as SchemaNodeExtended;
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Just confirm the mock hasn't changed
      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      const sourceChildNode = sourceNode.children[0];
      const targetChildNode = targetNode.children[0].children[2];

      addNodeToConnections(
        connections,
        sourceChildNode.children[0],
        addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
        targetChildNode.children[1],
        addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target)
      );

      //Add parents
      addNodeToConnections(
        connections,
        sourceChildNode,
        addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
        targetChildNode,
        addReactFlowPrefix(targetChildNode.key, SchemaType.Target)
      );
      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('LoopingWithIndex');
      expect(rootChildren[0][1]).not.toBe('string');

      const loopingObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['LoopingWithIndex'] as MapDefinitionEntry;
      const loopingEntries = Object.entries(loopingObject);
      expect(loopingEntries.length).toEqual(1);
      expect(loopingEntries[0][0]).toEqual('WeatherSummary');
      expect(loopingEntries[0][1]).not.toBe('string');

      const weatherSummaryObject = loopingObject['WeatherSummary'] as MapDefinitionEntry;
      const weatherSummaryEntries = Object.entries(weatherSummaryObject);
      expect(weatherSummaryEntries.length).toEqual(1);
      expect(weatherSummaryEntries[0][0]).toEqual('$for(/ns0:Root/LoopingWithIndex/WeatherReport)');
      expect(weatherSummaryEntries[0][1]).not.toBe('string');

      const dayForObject = weatherSummaryObject['$for(/ns0:Root/LoopingWithIndex/WeatherReport)'] as MapDefinitionEntry;
      const dayForObjectLoopEntries = Object.entries(dayForObject);
      expect(dayForObjectLoopEntries.length).toEqual(1);
      expect(dayForObjectLoopEntries[0][0]).toEqual('Day');
      expect(dayForObjectLoopEntries[0][1]).not.toBe('string');

      const dayObject = dayForObject['Day'] as MapDefinitionEntry;
      const dayEntries = Object.entries(dayObject);
      expect(dayEntries.length).toEqual(1);
      expect(dayEntries[0][0]).toEqual('Pressure');
      expect(dayEntries[0][1]).toEqual('./@Pressure');
    });

    it('Generates body with function loop', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
      const targetNode = extendedTargetSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
      const concatFunctionId = createReactFlowFunctionKey(concatFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Just confirm the mock hasn't changed
      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      const sourceChildNode = sourceNode.children[0];
      const targetChildNode = targetNode.children[0];

      addNodeToConnections(
        connections,
        sourceChildNode.children[0],
        addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
        concatFunction,
        concatFunctionId
      );
      addNodeToConnections(
        connections,
        sourceChildNode.children[1],
        addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source),
        concatFunction,
        concatFunctionId
      );
      addNodeToConnections(
        connections,
        concatFunction,
        concatFunctionId,
        targetChildNode.children[2],
        addReactFlowPrefix(targetChildNode.children[2].key, SchemaType.Target)
      );

      //Add parents
      addNodeToConnections(
        connections,
        sourceChildNode,
        addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
        targetChildNode,
        addReactFlowPrefix(targetChildNode.key, SchemaType.Target)
      );

      addNodeToConnections(
        connections,
        sourceChildNode.children[1],
        addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source),
        targetChildNode.children[0],
        addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target)
      );
      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('Looping');
      expect(rootChildren[0][1]).not.toBe('string');

      const loopObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['Looping'] as MapDefinitionEntry;
      const loopingEntries = Object.entries(loopObject);
      expect(loopingEntries.length).toEqual(1);
      expect(loopingEntries[0][0]).toEqual('$for(/ns0:Root/Looping/Employee)');
      expect(loopingEntries[0][1]).not.toBe('string');

      const employeeForObject = loopObject['$for(/ns0:Root/Looping/Employee)'] as MapDefinitionEntry;
      const employeeForLoopEntries = Object.entries(employeeForObject);
      expect(employeeForLoopEntries.length).toEqual(1);
      expect(employeeForLoopEntries[0][0]).toEqual('Person');
      expect(employeeForLoopEntries[0][1]).not.toBe('string');

      const employeeObject = employeeForObject['Person'] as MapDefinitionEntry;
      const employeeObjectEntries = Object.entries(employeeObject);
      expect(employeeObjectEntries.length).toEqual(2);
      expect(employeeObjectEntries[0][0]).toEqual('Other');
      expect(employeeObjectEntries[0][1]).toEqual('concat(TelephoneNumber, Name)');
      expect(employeeObjectEntries[1][0]).toEqual('Name');
      expect(employeeObjectEntries[1][1]).toEqual('Name');
    });

    it('Generates body with index loop', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
      const targetNode = extendedTargetSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
      const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Just confirm the mock hasn't changed
      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      const sourceChildNode = sourceNode.children[0];
      const targetChildNode = targetNode.children[0];

      addNodeToConnections(
        connections,
        sourceChildNode.children[0],
        addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
        targetChildNode.children[1],
        addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target)
      );

      //Add parents
      addNodeToConnections(
        connections,
        sourceChildNode,
        addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
        indexPseudoFunction,
        indexFunctionId
      );
      addNodeToConnections(
        connections,
        indexPseudoFunction,
        indexFunctionId,
        targetChildNode,
        addReactFlowPrefix(targetChildNode.key, SchemaType.Target)
      );

      addNodeToConnections(
        connections,
        sourceChildNode.children[1],
        addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source),
        targetChildNode.children[0],
        addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target)
      );
      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('Looping');
      expect(rootChildren[0][1]).not.toBe('string');

      const loopObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['Looping'] as MapDefinitionEntry;
      const loopingEntries = Object.entries(loopObject);
      expect(loopingEntries.length).toEqual(1);
      expect(loopingEntries[0][0]).toEqual('$for(/ns0:Root/Looping/Employee, $i)');
      expect(loopingEntries[0][1]).not.toBe('string');

      const employeeForObject = loopObject['$for(/ns0:Root/Looping/Employee, $i)'] as MapDefinitionEntry;
      const employeeForLoopEntries = Object.entries(employeeForObject);
      expect(employeeForLoopEntries.length).toEqual(1);
      expect(employeeForLoopEntries[0][0]).toEqual('Person');
      expect(employeeForLoopEntries[0][1]).not.toBe('string');

      const employeeObject = employeeForObject['Person'] as MapDefinitionEntry;
      const employeeObjectEntries = Object.entries(employeeObject);
      expect(employeeObjectEntries.length).toEqual(2);
      expect(employeeObjectEntries[0][0]).toEqual('Address');
      expect(employeeObjectEntries[0][1]).toEqual('TelephoneNumber');
      expect(employeeObjectEntries[1][0]).toEqual('Name');
      expect(employeeObjectEntries[1][1]).toEqual('Name');
    });

    it('Generates body with index and passthrough loop', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
      const targetNode = extendedTargetSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
      const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Just confirm the mock hasn't changed
      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      const sourceChildNode = sourceNode.children[0];
      const targetChildNode = targetNode.children[0];

      //Add parents
      addNodeToConnections(
        connections,
        sourceChildNode,
        addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
        indexPseudoFunction,
        indexFunctionId
      );
      addNodeToConnections(
        connections,
        indexPseudoFunction,
        indexFunctionId,
        targetChildNode,
        addReactFlowPrefix(targetChildNode.key, SchemaType.Target)
      );
      addNodeToConnections(
        connections,
        indexPseudoFunction,
        indexFunctionId,
        targetChildNode.children[0],
        addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target)
      );

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('Looping');
      expect(rootChildren[0][1]).not.toBe('string');

      const loopObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['Looping'] as MapDefinitionEntry;
      const loopingEntries = Object.entries(loopObject);
      expect(loopingEntries.length).toEqual(1);
      expect(loopingEntries[0][0]).toEqual('$for(/ns0:Root/Looping/Employee, $i)');
      expect(loopingEntries[0][1]).not.toBe('string');

      const employeeForObject = loopObject['$for(/ns0:Root/Looping/Employee, $i)'] as MapDefinitionEntry;
      const employeeForLoopEntries = Object.entries(employeeForObject);
      expect(employeeForLoopEntries.length).toEqual(1);
      expect(employeeForLoopEntries[0][0]).toEqual('Person');
      expect(employeeForLoopEntries[0][1]).not.toBe('string');

      const employeeObject = employeeForObject['Person'] as MapDefinitionEntry;
      const employeeObjectEntries = Object.entries(employeeObject);
      expect(employeeObjectEntries.length).toEqual(1);
      expect(employeeObjectEntries[0][0]).toEqual('Name');
      expect(employeeObjectEntries[0][1]).toEqual('$i');
    });

    it('Generates body with function and index loop', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
      const targetNode = extendedTargetSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
      const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
      const concatFunctionId = createReactFlowFunctionKey(concatFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Just confirm the mock hasn't changed
      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      const sourceChildNode = sourceNode.children[0];
      const targetChildNode = targetNode.children[0];

      addNodeToConnections(
        connections,
        sourceChildNode.children[0],
        addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
        targetChildNode.children[1],
        addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target)
      );

      //Add parents
      addNodeToConnections(
        connections,
        sourceChildNode,
        addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
        indexPseudoFunction,
        indexFunctionId
      );
      addNodeToConnections(
        connections,
        indexPseudoFunction,
        indexFunctionId,
        targetChildNode,
        addReactFlowPrefix(targetChildNode.key, SchemaType.Target)
      );

      addNodeToConnections(
        connections,
        sourceChildNode.children[1],
        addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source),
        concatFunction,
        concatFunctionId
      );
      addNodeToConnections(connections, indexPseudoFunction, indexFunctionId, concatFunction, concatFunctionId);

      addNodeToConnections(
        connections,
        concatFunction,
        concatFunctionId,
        targetChildNode.children[0],
        addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target)
      );

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('Looping');
      expect(rootChildren[0][1]).not.toBe('string');

      const loopObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['Looping'] as MapDefinitionEntry;
      const loopingEntries = Object.entries(loopObject);
      expect(loopingEntries.length).toEqual(1);
      expect(loopingEntries[0][0]).toEqual('$for(/ns0:Root/Looping/Employee, $i)');
      expect(loopingEntries[0][1]).not.toBe('string');

      const employeeForObject = loopObject['$for(/ns0:Root/Looping/Employee, $i)'] as MapDefinitionEntry;
      const employeeForLoopEntries = Object.entries(employeeForObject);
      expect(employeeForLoopEntries.length).toEqual(1);
      expect(employeeForLoopEntries[0][0]).toEqual('Person');
      expect(employeeForLoopEntries[0][1]).not.toBe('string');

      const employeeObject = employeeForObject['Person'] as MapDefinitionEntry;
      const employeeObjectEntries = Object.entries(employeeObject);
      expect(employeeObjectEntries.length).toEqual(2);
      expect(employeeObjectEntries[0][0]).toEqual('Address');
      expect(employeeObjectEntries[0][1]).toEqual('TelephoneNumber');
      expect(employeeObjectEntries[1][0]).toEqual('Name');
      expect(employeeObjectEntries[1][1]).toEqual('concat(Name, $i)');
    });
  });

  describe('splitKeyIntoChildren', () => {
    it('No nested functions', async () => {
      expect(splitKeyIntoChildren('to-lower(EmployeeName)')).toEqual(['EmployeeName']);
    });

    it('Multiple node ids', async () => {
      expect(splitKeyIntoChildren('concat(EmployeeName, EmployeeID)')).toEqual(['EmployeeName', 'EmployeeID']);
    });

    it('Content enricher', async () => {
      expect(splitKeyIntoChildren('get-date()')).toEqual([]);
    });

    it('Mixed node and function', async () => {
      expect(splitKeyIntoChildren('concat(EmployeeName, string(EmployeeID))')).toEqual(['EmployeeName', 'string(EmployeeID)']);
    });

    it('Multiple functions', async () => {
      expect(splitKeyIntoChildren('concat(to-lower(EmployeeName), string(EmployeeID))')).toEqual([
        'to-lower(EmployeeName)',
        'string(EmployeeID)',
      ]);
    });

    it('Single constant', async () => {
      expect(splitKeyIntoChildren('to-lower("UpperCase")')).toEqual([`"UpperCase"`]);
    });

    it('Constants with parenthesis', async () => {
      expect(splitKeyIntoChildren('to-lower("(UpperCase)")')).toEqual([`"(UpperCase)"`]);
    });

    it('Constants with half parenthesis', async () => {
      expect(splitKeyIntoChildren('concat(to-lower("(SingleLeft"), "(2ndSingleLeft")')).toEqual([
        `to-lower("(SingleLeft")`,
        `"(2ndSingleLeft"`,
      ]);
    });

    it('Complex', async () => {
      expect(splitKeyIntoChildren('concat(to-lower(EmployeeName), "Start Date: ", get-date(), string(EmployeeID))')).toEqual([
        'to-lower(EmployeeName)',
        `"Start Date: "`,
        'get-date()',
        'string(EmployeeID)',
      ]);
    });
  });
});
