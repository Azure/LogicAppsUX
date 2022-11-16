import { layeredLoopSourceMockSchema, layeredLoopTargetMockSchema, sourceMockSchema, targetMockSchema } from '../__mocks__';
import { concatFunction, greaterThanFunction } from '../__mocks__/FunctionMock';
import type { MapDefinitionEntry, Schema, SchemaExtended, SchemaNodeExtended } from '../models';
import { SchemaType } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { ifPseudoFunction, indexPseudoFunction } from '../models/Function';
import { addNodeToConnections } from '../utils/Connection.Utils';
import { generateMapDefinitionBody, generateMapDefinitionHeader, splitKeyIntoChildren } from '../utils/DataMap.Utils';
import { addReactFlowPrefix, createReactFlowFunctionKey } from '../utils/ReactFlow.Util';
import { convertSchemaToSchemaExtended } from '../utils/Schema.Utils';

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

    it('Generates body with value object', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children[1].children[0];
      const targetNode = extendedTargetSchema.schemaTreeRoot.children[1].children[0];
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      addNodeToConnections(
        connections,
        sourceNode.children[2],
        addReactFlowPrefix(sourceNode.children[2].key, SchemaType.Source),
        targetNode.children[0],
        addReactFlowPrefix(targetNode.children[0].key, SchemaType.Target)
      );

      addNodeToConnections(
        connections,
        sourceNode.children[0],
        addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
        targetNode,
        addReactFlowPrefix(targetNode.key, SchemaType.Target)
      );
      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('DataTranslation');
      expect(rootChildren[0][1]).not.toBe('string');

      const dataTranslationObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['DataTranslation'] as MapDefinitionEntry;
      const dataTranslationChildren = Object.entries(dataTranslationObject);
      expect(dataTranslationChildren.length).toEqual(1);
      expect(dataTranslationChildren[0][0]).toEqual('EmployeeName');
      expect(dataTranslationChildren[0][1]).not.toBe('string');

      const employeeNameObject = dataTranslationObject['EmployeeName'] as MapDefinitionEntry;
      const employeeNameChildren = Object.entries(employeeNameObject);
      expect(employeeNameChildren.length).toEqual(2);
      expect(employeeNameChildren[0][0]).toEqual('$@RegularFulltime');
      expect(employeeNameChildren[0][1]).toEqual('/ns0:Root/DataTranslation/Employee/EmploymentStatus');
      expect(employeeNameChildren[1][0]).toEqual('$value');
      expect(employeeNameChildren[1][1]).toEqual('/ns0:Root/DataTranslation/Employee/FirstName');
    });

    it('Generates body with a function', async () => {
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

    it('Generates body with a conditional', async () => {
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

    it('Generates body with nested loops', async () => {
      const loopSourceSchema: Schema = layeredLoopSourceMockSchema;
      const extendedLoopSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(loopSourceSchema);

      const loopTargetSchema: Schema = layeredLoopTargetMockSchema;
      const extendedLoopTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(loopTargetSchema);

      const sourceNode = extendedLoopSourceSchema.schemaTreeRoot.children[0];
      const targetNode = extendedLoopTargetSchema.schemaTreeRoot.children[0];
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      const sourceChildNode = sourceNode.children[0];
      const targetChildNode = targetNode.children[0];

      addNodeToConnections(
        connections,
        sourceChildNode,
        addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
        targetChildNode,
        addReactFlowPrefix(targetChildNode.key, SchemaType.Target)
      );
      addNodeToConnections(
        connections,
        sourceChildNode.children[0],
        addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
        targetChildNode.children[0],
        addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target)
      );
      addNodeToConnections(
        connections,
        sourceChildNode.children[0].children[0],
        addReactFlowPrefix(sourceChildNode.children[0].children[0].key, SchemaType.Source),
        targetChildNode.children[0].children[0],
        addReactFlowPrefix(targetChildNode.children[0].children[0].key, SchemaType.Target)
      );
      addNodeToConnections(
        connections,
        sourceChildNode.children[0].children[0].children[0],
        addReactFlowPrefix(sourceChildNode.children[0].children[0].children[0].key, SchemaType.Source),
        targetChildNode.children[0].children[0].children[0],
        addReactFlowPrefix(targetChildNode.children[0].children[0].children[0].key, SchemaType.Target)
      );
      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('ManyToMany');
      expect(rootChildren[0][1]).not.toBe('string');

      const manyToManyObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['ManyToMany'] as MapDefinitionEntry;
      const manyToManyEntries = Object.entries(manyToManyObject);
      expect(manyToManyEntries.length).toEqual(1);
      expect(manyToManyEntries[0][0]).toEqual('$for(/ns0:Root/ManyToMany/SourceYear)');
      expect(manyToManyEntries[0][1]).not.toBe('string');

      const yearForObject = manyToManyObject['$for(/ns0:Root/ManyToMany/SourceYear)'] as MapDefinitionEntry;
      const yearForLoopEntries = Object.entries(yearForObject);
      expect(yearForLoopEntries.length).toEqual(1);
      expect(yearForLoopEntries[0][0]).toEqual('Year');
      expect(yearForLoopEntries[0][1]).not.toBe('string');

      const yearObject = yearForObject['Year'] as MapDefinitionEntry;
      const yearEntries = Object.entries(yearObject);
      expect(yearEntries.length).toEqual(1);
      expect(yearEntries[0][0]).toEqual('$for(SourceMonth)');
      expect(yearEntries[0][1]).not.toBe('string');

      const monthForObject = yearObject['$for(SourceMonth)'] as MapDefinitionEntry;
      const monthForLoopEntries = Object.entries(monthForObject);
      expect(monthForLoopEntries.length).toEqual(1);
      expect(monthForLoopEntries[0][0]).toEqual('Month');
      expect(monthForLoopEntries[0][1]).not.toBe('string');

      const monthObject = monthForObject['Month'] as MapDefinitionEntry;
      const monthEntries = Object.entries(monthObject);
      expect(monthEntries.length).toEqual(1);
      expect(monthEntries[0][0]).toEqual('$for(SourceDay)');
      expect(monthEntries[0][1]).not.toBe('string');

      const dayForObject = monthObject['$for(SourceDay)'] as MapDefinitionEntry;
      const dayForLoopEntries = Object.entries(dayForObject);
      expect(dayForLoopEntries.length).toEqual(1);
      expect(dayForLoopEntries[0][0]).toEqual('Day');
      expect(dayForLoopEntries[0][1]).not.toBe('string');

      const dayObject = dayForObject['Day'] as MapDefinitionEntry;
      const dayEntries = Object.entries(dayObject);
      expect(dayEntries.length).toEqual(1);
      expect(dayEntries[0][0]).toEqual('Date');
      expect(dayEntries[0][1]).toEqual('SourceDate');
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
      expect(loopingEntries[0][0]).toEqual('$for(/ns0:Root/Looping/Employee, $a)');
      expect(loopingEntries[0][1]).not.toBe('string');

      const employeeForObject = loopObject['$for(/ns0:Root/Looping/Employee, $a)'] as MapDefinitionEntry;
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
      expect(loopingEntries[0][0]).toEqual('$for(/ns0:Root/Looping/Employee, $a)');
      expect(loopingEntries[0][1]).not.toBe('string');

      const employeeForObject = loopObject['$for(/ns0:Root/Looping/Employee, $a)'] as MapDefinitionEntry;
      const employeeForLoopEntries = Object.entries(employeeForObject);
      expect(employeeForLoopEntries.length).toEqual(1);
      expect(employeeForLoopEntries[0][0]).toEqual('Person');
      expect(employeeForLoopEntries[0][1]).not.toBe('string');

      const employeeObject = employeeForObject['Person'] as MapDefinitionEntry;
      const employeeObjectEntries = Object.entries(employeeObject);
      expect(employeeObjectEntries.length).toEqual(1);
      expect(employeeObjectEntries[0][0]).toEqual('Name');
      expect(employeeObjectEntries[0][1]).toEqual('$a');
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
      expect(loopingEntries[0][0]).toEqual('$for(/ns0:Root/Looping/Employee, $a)');
      expect(loopingEntries[0][1]).not.toBe('string');

      const employeeForObject = loopObject['$for(/ns0:Root/Looping/Employee, $a)'] as MapDefinitionEntry;
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
      expect(employeeObjectEntries[1][1]).toEqual('concat(Name, $a)');
    });

    it('Generates body with conditional looping', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children[5].children[0].children[0];
      const targetNode = extendedTargetSchema.schemaTreeRoot.children[6].children[0];
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
        targetNode.children[0].children[0],
        addReactFlowPrefix(targetNode.children[0].children[0].key, SchemaType.Target)
      );

      //Add parents
      addNodeToConnections(
        connections,
        sourceNode,
        addReactFlowPrefix(sourceNode.key, SchemaType.Source),
        targetNode,
        addReactFlowPrefix(targetNode.key, SchemaType.Target)
      );

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('ConditionalLooping');
      expect(rootChildren[0][1]).not.toBe('string');

      const conditionalLoopingObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['ConditionalLooping'] as MapDefinitionEntry;
      const conditionalLoopingChildren = Object.entries(conditionalLoopingObject);
      expect(conditionalLoopingChildren.length).toEqual(1);
      expect(conditionalLoopingChildren[0][0]).toEqual('$for(/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product)');
      expect(conditionalLoopingChildren[0][1]).not.toBe('string');

      const forObject = conditionalLoopingObject['$for(/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product)'] as MapDefinitionEntry;
      const forChildren = Object.entries(forObject);
      expect(forChildren.length).toEqual(1);
      expect(forChildren[0][0]).toEqual('CategorizedCatalog');
      expect(forChildren[0][1]).not.toBe('string');

      const categorizedCatalogObject = forObject['CategorizedCatalog'] as MapDefinitionEntry;
      const categorizedCatalogChildren = Object.entries(categorizedCatalogObject);
      expect(categorizedCatalogChildren.length).toEqual(1);
      expect(categorizedCatalogChildren[0][0]).toEqual('PetProduct');
      expect(categorizedCatalogChildren[0][1]).not.toBe('string');

      const petProductObject = categorizedCatalogObject['PetProduct'] as MapDefinitionEntry;
      const petProductChildren = Object.entries(petProductObject);
      expect(petProductChildren.length).toEqual(1);
      expect(petProductChildren[0][0]).toEqual(
        '$if(is-greater-than(/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/Name, /ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/SKU))'
      );
      expect(petProductChildren[0][1]).not.toBe('string');

      const ifObject = petProductObject[
        '$if(is-greater-than(/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/Name, /ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/SKU))'
      ] as MapDefinitionEntry;
      const ifChildren = Object.entries(ifObject);
      expect(ifChildren.length).toEqual(1);
      expect(ifChildren[0][0]).toEqual('Name');
      expect(ifChildren[0][1]).toEqual('Name');
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
