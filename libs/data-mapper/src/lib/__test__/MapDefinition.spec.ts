import { layeredLoopSourceMockSchema, layeredLoopTargetMockSchema, sourceMockSchema, targetMockSchema } from '../__mocks__';
import { concatFunction, greaterThanFunction } from '../__mocks__/FunctionMock';
import type { MapDefinitionEntry, Schema, SchemaExtended, SchemaNodeExtended } from '../models';
import { SchemaType } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { directAccessPseudoFunction, ifPseudoFunction, indexPseudoFunction } from '../models/Function';
import { setConnectionInputValue } from '../utils/Connection.Utils';
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

      setConnectionInputValue(connections, {
        targetNode: targetNode.children[0].children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
          node: sourceNode.children[0],
        },
      });

      setConnectionInputValue(connections, {
        targetNode: targetNode.children[0].children[1],
        targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[1].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source),
          node: sourceNode.children[1],
        },
      });

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

      setConnectionInputValue(connections, {
        targetNode: targetNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[2].key, SchemaType.Source),
          node: sourceNode.children[2],
        },
      });

      setConnectionInputValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
          node: sourceNode.children[0],
        },
      });

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

      setConnectionInputValue(connections, {
        targetNode: concatFunction,
        targetNodeReactFlowKey: concatFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
          node: sourceNode.children[0],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: concatFunction,
        targetNodeReactFlowKey: concatFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source),
          node: sourceNode.children[1],
        },
      });

      setConnectionInputValue(connections, {
        targetNode: targetNode.children[0].children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: concatFunctionId,
          node: concatFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetNode.children[0].children[1],
        targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[1].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source),
          node: sourceNode.children[1],
        },
      });

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
      setConnectionInputValue(connections, {
        targetNode: greaterThanFunction,
        targetNodeReactFlowKey: greaterThanId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
          node: sourceNode.children[0],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: greaterThanFunction,
        targetNodeReactFlowKey: greaterThanId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source),
          node: sourceNode.children[1],
        },
      });

      // Inputs to conditional
      setConnectionInputValue(connections, {
        targetNode: ifPseudoFunction,
        targetNodeReactFlowKey: ifFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: greaterThanId,
          node: greaterThanFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: ifPseudoFunction,
        targetNodeReactFlowKey: ifFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
          node: sourceNode.children[0],
        },
      });

      //Conditional to target
      setConnectionInputValue(connections, {
        targetNode: targetNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: ifFunctionId,
          node: ifPseudoFunction,
        },
      });

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

      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[1],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0],
        },
      });

      //Add parents
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
          node: sourceChildNode,
        },
      });

      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source),
          node: sourceChildNode.children[1],
        },
      });

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

      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[1],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0],
        },
      });

      //Add parents
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
          node: sourceChildNode,
        },
      });

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

    it('Generates body with many to many nested loops', async () => {
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

      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
          node: sourceChildNode,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[0].children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0].children[0],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[0].children[0].children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].children[0].children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].children[0].children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0].children[0].children[0],
        },
      });

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

    it('Generates body with many to one nested loops', async () => {
      const loopSourceSchema: Schema = layeredLoopSourceMockSchema;
      const extendedLoopSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(loopSourceSchema);

      const loopTargetSchema: Schema = layeredLoopTargetMockSchema;
      const extendedLoopTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(loopTargetSchema);

      const sourceNode = extendedLoopSourceSchema.schemaTreeRoot.children[1];
      const targetNode = extendedLoopTargetSchema.schemaTreeRoot.children[1];
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      const sourceChildNode = sourceNode.children[0];
      const targetChildNode = targetNode.children[0];

      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
          node: sourceChildNode,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0].children[0],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].children[0].children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0].children[0].children[0],
        },
      });

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('ManyToOne');
      expect(rootChildren[0][1]).not.toBe('string');

      const ManyToOneObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['ManyToOne'] as MapDefinitionEntry;
      const ManyToOneEntries = Object.entries(ManyToOneObject);
      expect(ManyToOneEntries.length).toEqual(1);
      expect(ManyToOneEntries[0][0]).toEqual('$for(/ns0:Root/ManyToOne/SourceYear)');
      expect(ManyToOneEntries[0][1]).not.toBe('string');

      const yearForObject = ManyToOneObject['$for(/ns0:Root/ManyToOne/SourceYear)'] as MapDefinitionEntry;
      const yearForLoopEntries = Object.entries(yearForObject);
      expect(yearForLoopEntries.length).toEqual(1);
      expect(yearForLoopEntries[0][0]).toEqual('$for(SourceMonth)');
      expect(yearForLoopEntries[0][1]).not.toBe('string');

      const monthForObject = yearForObject['$for(SourceMonth)'] as MapDefinitionEntry;
      const monthForLoopEntries = Object.entries(monthForObject);
      expect(monthForLoopEntries.length).toEqual(1);
      expect(monthForLoopEntries[0][0]).toEqual('$for(SourceDay)');
      expect(monthForLoopEntries[0][1]).not.toBe('string');

      const dayForObject = monthForObject['$for(SourceDay)'] as MapDefinitionEntry;
      const dayForLoopEntries = Object.entries(dayForObject);
      expect(dayForLoopEntries.length).toEqual(1);
      expect(dayForLoopEntries[0][0]).toEqual('Date');
      expect(dayForLoopEntries[0][1]).not.toBe('string');

      const dayObject = dayForObject['Date'] as MapDefinitionEntry;
      const dayEntries = Object.entries(dayObject);
      expect(dayEntries.length).toEqual(1);
      expect(dayEntries[0][0]).toEqual('DayName');
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

      setConnectionInputValue(connections, {
        targetNode: concatFunction,
        targetNodeReactFlowKey: concatFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: concatFunction,
        targetNodeReactFlowKey: concatFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source),
          node: sourceChildNode.children[1],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[2],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[2].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: concatFunctionId,
          node: concatFunction,
        },
      });

      //Add parents
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
          node: sourceChildNode,
        },
      });

      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source),
          node: sourceChildNode.children[1],
        },
      });

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

      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[1],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0],
        },
      });

      //Add parents
      setConnectionInputValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: indexFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
          node: sourceChildNode,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: indexFunctionId,
          node: indexPseudoFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source),
          node: sourceChildNode.children[1],
        },
      });

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
      setConnectionInputValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: indexFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
          node: sourceChildNode,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: indexFunctionId,
          node: indexPseudoFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: indexFunctionId,
          node: indexPseudoFunction,
        },
      });

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

      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[1],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0],
        },
      });

      //Add parents
      setConnectionInputValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: indexFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
          node: sourceChildNode,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: indexFunctionId,
          node: indexPseudoFunction,
        },
      });

      setConnectionInputValue(connections, {
        targetNode: concatFunction,
        targetNodeReactFlowKey: concatFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source),
          node: sourceChildNode.children[1],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: concatFunction,
        targetNodeReactFlowKey: concatFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: indexFunctionId,
          node: indexPseudoFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: concatFunctionId,
          node: concatFunction,
        },
      });

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

    it('Generates body with many to one nested index loops', async () => {
      const loopSourceSchema: Schema = layeredLoopSourceMockSchema;
      const extendedLoopSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(loopSourceSchema);

      const loopTargetSchema: Schema = layeredLoopTargetMockSchema;
      const extendedLoopTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(loopTargetSchema);

      const sourceNode = extendedLoopSourceSchema.schemaTreeRoot.children[1];
      const targetNode = extendedLoopTargetSchema.schemaTreeRoot.children[1];
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      const sourceChildNode = sourceNode.children[0];
      const targetChildNode = targetNode.children[0];

      const yearIndex = createReactFlowFunctionKey(indexPseudoFunction);
      const monthIndex = createReactFlowFunctionKey(indexPseudoFunction);
      const dayIndex = createReactFlowFunctionKey(indexPseudoFunction);

      // Year
      setConnectionInputValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: yearIndex,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.key, SchemaType.Source),
          node: sourceChildNode,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: yearIndex,
          node: indexPseudoFunction,
        },
      });

      // Month
      setConnectionInputValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: monthIndex,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: monthIndex,
          node: indexPseudoFunction,
        },
      });

      // Day
      setConnectionInputValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: dayIndex,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0].children[0],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: dayIndex,
          node: indexPseudoFunction,
        },
      });

      setConnectionInputValue(connections, {
        targetNode: targetChildNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceChildNode.children[0].children[0].children[0].key, SchemaType.Source),
          node: sourceChildNode.children[0].children[0].children[0],
        },
      });

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('ManyToOne');
      expect(rootChildren[0][1]).not.toBe('string');

      const ManyToOneObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['ManyToOne'] as MapDefinitionEntry;
      const ManyToOneEntries = Object.entries(ManyToOneObject);
      expect(ManyToOneEntries.length).toEqual(1);
      expect(ManyToOneEntries[0][0]).toEqual('$for(/ns0:Root/ManyToOne/SourceYear, $a)');
      expect(ManyToOneEntries[0][1]).not.toBe('string');

      const yearForObject = ManyToOneObject['$for(/ns0:Root/ManyToOne/SourceYear, $a)'] as MapDefinitionEntry;
      const yearForLoopEntries = Object.entries(yearForObject);
      expect(yearForLoopEntries.length).toEqual(1);
      expect(yearForLoopEntries[0][0]).toEqual('$for(SourceMonth, $b)');
      expect(yearForLoopEntries[0][1]).not.toBe('string');

      const monthForObject = yearForObject['$for(SourceMonth, $b)'] as MapDefinitionEntry;
      const monthForLoopEntries = Object.entries(monthForObject);
      expect(monthForLoopEntries.length).toEqual(1);
      expect(monthForLoopEntries[0][0]).toEqual('$for(SourceDay, $c)');
      expect(monthForLoopEntries[0][1]).not.toBe('string');

      const dayForObject = monthForObject['$for(SourceDay, $c)'] as MapDefinitionEntry;
      const dayForLoopEntries = Object.entries(dayForObject);
      expect(dayForLoopEntries.length).toEqual(1);
      expect(dayForLoopEntries[0][0]).toEqual('Date');
      expect(dayForLoopEntries[0][1]).not.toBe('string');

      const dayObject = dayForObject['Date'] as MapDefinitionEntry;
      const dayEntries = Object.entries(dayObject);
      expect(dayEntries.length).toEqual(1);
      expect(dayEntries[0][0]).toEqual('DayName');
      expect(dayEntries[0][1]).toEqual('SourceDate');
    });

    it('Generates body with conditional looping', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children[5].children[0].children[0];
      const targetNode = extendedTargetSchema.schemaTreeRoot.children[6].children[0];
      const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
      const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Source to greater than
      setConnectionInputValue(connections, {
        targetNode: greaterThanFunction,
        targetNodeReactFlowKey: greaterThanId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
          node: sourceNode.children[0],
        },
      });
      setConnectionInputValue(connections, {
        targetNode: greaterThanFunction,
        targetNodeReactFlowKey: greaterThanId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source),
          node: sourceNode.children[1],
        },
      });

      // Inputs to conditional
      setConnectionInputValue(connections, {
        targetNode: ifPseudoFunction,
        targetNodeReactFlowKey: ifFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: greaterThanId,
          node: greaterThanFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: ifPseudoFunction,
        targetNodeReactFlowKey: ifFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.key, SchemaType.Source),
          node: sourceNode,
        },
      });

      //Conditional to target
      setConnectionInputValue(connections, {
        targetNode: targetNode.children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: ifFunctionId,
          node: ifPseudoFunction,
        },
      });

      //Properties connection
      setConnectionInputValue(connections, {
        targetNode: targetNode.children[0].children[0],
        targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[0].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
          node: sourceNode.children[0],
        },
      });

      //Add parents
      setConnectionInputValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: addReactFlowPrefix(targetNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(sourceNode.key, SchemaType.Source),
          node: sourceNode,
        },
      });

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
      expect(categorizedCatalogChildren[0][0]).toEqual('$if(is-greater-than(Name, SKU))');
      expect(categorizedCatalogChildren[0][1]).not.toBe('string');

      const ifObject = categorizedCatalogObject['$if(is-greater-than(Name, SKU))'] as MapDefinitionEntry;
      const ifChildren = Object.entries(ifObject);
      expect(ifChildren.length).toEqual(1);
      expect(ifChildren[0][0]).toEqual('PetProduct');
      expect(ifChildren[0][1]).not.toBe('string');

      const petProductObject = ifObject['PetProduct'] as MapDefinitionEntry;
      const petProductChildren = Object.entries(petProductObject);
      expect(petProductChildren.length).toEqual(1);
      expect(petProductChildren[0][0]).toEqual('Name');
      expect(petProductChildren[0][1]).toEqual('Name');
    });

    it('Generates body with an index and a conditional looping', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find(
        (child) => child.name === 'LoopingWithIndex'
      ) as SchemaNodeExtended;
      const targetNode = extendedTargetSchema.schemaTreeRoot.children.find(
        (child) => child.name === 'LoopingWithIndex'
      ) as SchemaNodeExtended;
      const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
      const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
      const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Just confirm the mock hasn't changed
      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      const parentSourceNode = sourceNode.children[0];
      const parentTargetNode = targetNode.children[0].children[2];

      // Parent source to index
      setConnectionInputValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: indexFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.key, SchemaType.Source),
          node: parentSourceNode,
        },
      });

      // Index to Greater than
      setConnectionInputValue(connections, {
        targetNode: greaterThanFunction,
        targetNodeReactFlowKey: greaterThanId,
        findInputSlot: true,
        value: {
          reactFlowKey: indexFunctionId,
          node: indexPseudoFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: greaterThanFunction,
        targetNodeReactFlowKey: greaterThanId,
        inputIndex: 1,
        value: '10',
      });

      // Greater than and source parent to if
      setConnectionInputValue(connections, {
        targetNode: ifPseudoFunction,
        targetNodeReactFlowKey: ifFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: greaterThanId,
          node: greaterThanFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: ifPseudoFunction,
        targetNodeReactFlowKey: ifFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.key, SchemaType.Source),
          node: parentSourceNode,
        },
      });

      // If to parent target
      setConnectionInputValue(connections, {
        targetNode: parentTargetNode,
        targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: ifFunctionId,
          node: ifPseudoFunction,
        },
      });

      // Property source to target
      setConnectionInputValue(connections, {
        targetNode: parentTargetNode.children[1],
        targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.children[1].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.children[0].key, SchemaType.Source),
          node: parentSourceNode.children[0],
        },
      });

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('LoopingWithIndex');
      expect(rootChildren[0][1]).not.toBe('string');

      const loopingWithIndexObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['LoopingWithIndex'] as MapDefinitionEntry;
      const loopingWithIndexChildren = Object.entries(loopingWithIndexObject);
      expect(loopingWithIndexChildren.length).toEqual(1);
      expect(loopingWithIndexChildren[0][0]).toEqual('WeatherSummary');
      expect(loopingWithIndexChildren[0][1]).not.toBe('string');

      const weatherSummaryObject = loopingWithIndexObject['WeatherSummary'] as MapDefinitionEntry;
      const weatherSummaryChildren = Object.entries(weatherSummaryObject);
      expect(weatherSummaryChildren.length).toEqual(1);
      expect(weatherSummaryChildren[0][0]).toEqual('$for(/ns0:Root/LoopingWithIndex/WeatherReport, $a)');
      expect(weatherSummaryChildren[0][1]).not.toBe('string');

      const forObject = weatherSummaryObject['$for(/ns0:Root/LoopingWithIndex/WeatherReport, $a)'] as MapDefinitionEntry;
      const forChildren = Object.entries(forObject);
      expect(forChildren.length).toEqual(1);
      expect(forChildren[0][0]).toEqual('$if(is-greater-than($a, 10))');
      expect(forChildren[0][1]).not.toBe('string');

      const ifObject = forObject['$if(is-greater-than($a, 10))'] as MapDefinitionEntry;
      const ifChildren = Object.entries(ifObject);
      expect(ifChildren.length).toEqual(1);
      expect(ifChildren[0][0]).toEqual('Day');
      expect(ifChildren[0][1]).not.toBe('string');

      const dayObject = ifObject['Day'] as MapDefinitionEntry;
      const dayChildren = Object.entries(dayObject);
      expect(dayChildren.length).toEqual(1);
      expect(dayChildren[0][0]).toEqual('Pressure');
      expect(dayChildren[0][1]).toEqual('./@Pressure');
    });

    it('Generates body with custom value direct index access', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find(
        (child) => child.name === 'LoopingWithIndex'
      ) as SchemaNodeExtended;
      const targetNode = extendedTargetSchema.schemaTreeRoot.children.find(
        (child) => child.name === 'LoopingWithIndex'
      ) as SchemaNodeExtended;
      const directAccessId = createReactFlowFunctionKey(directAccessPseudoFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Just confirm the mock hasn't changed
      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      const parentSourceNode = sourceNode.children[0];
      const parentTargetNode = targetNode.children[0].children[0];

      // Connect to direct access
      setConnectionInputValue(connections, {
        targetNode: directAccessPseudoFunction,
        targetNodeReactFlowKey: directAccessId,
        inputIndex: 0,
        value: '1',
      });
      setConnectionInputValue(connections, {
        targetNode: directAccessPseudoFunction,
        targetNodeReactFlowKey: directAccessId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.key, SchemaType.Source),
          node: parentSourceNode,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: directAccessPseudoFunction,
        targetNodeReactFlowKey: directAccessId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.children[0].key, SchemaType.Source),
          node: parentSourceNode.children[0],
        },
      });

      // Direct access to target
      setConnectionInputValue(connections, {
        targetNode: parentTargetNode.children[1],
        targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.children[1].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: directAccessId,
          node: directAccessPseudoFunction,
        },
      });

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('LoopingWithIndex');
      expect(rootChildren[0][1]).not.toBe('string');

      const loopingWithIndexObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['LoopingWithIndex'] as MapDefinitionEntry;
      const loopingWithIndexChildren = Object.entries(loopingWithIndexObject);
      expect(loopingWithIndexChildren.length).toEqual(1);
      expect(loopingWithIndexChildren[0][0]).toEqual('WeatherSummary');
      expect(loopingWithIndexChildren[0][1]).not.toBe('string');

      const weatherSummaryObject = loopingWithIndexObject['WeatherSummary'] as MapDefinitionEntry;
      const weatherSummaryChildren = Object.entries(weatherSummaryObject);
      expect(weatherSummaryChildren.length).toEqual(1);
      expect(weatherSummaryChildren[0][0]).toEqual('Day1');
      expect(weatherSummaryChildren[0][1]).not.toBe('string');

      const dayObject = weatherSummaryObject['Day1'] as MapDefinitionEntry;
      const dayChildren = Object.entries(dayObject);
      expect(dayChildren.length).toEqual(1);
      expect(dayChildren[0][0]).toEqual('Pressure');
      expect(dayChildren[0][1]).toEqual('/ns0:Root/LoopingWithIndex/WeatherReport[1]/@Pressure');
    });

    it('Generates body with an index loop, a conditional and direct index access', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find(
        (child) => child.name === 'LoopingWithIndex'
      ) as SchemaNodeExtended;
      const targetNode = extendedTargetSchema.schemaTreeRoot.children.find(
        (child) => child.name === 'LoopingWithIndex'
      ) as SchemaNodeExtended;
      const directAccessId = createReactFlowFunctionKey(directAccessPseudoFunction);
      const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Just confirm the mock hasn't changed
      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      const parentSourceNode = sourceNode.children[0];
      const parentTargetNode = targetNode.children[0].children[2];

      // Parent source to index
      setConnectionInputValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: indexFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.key, SchemaType.Source),
          node: parentSourceNode,
        },
      });

      // Connect index to parent target
      setConnectionInputValue(connections, {
        targetNode: parentTargetNode,
        targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: indexFunctionId,
          node: indexPseudoFunction,
        },
      });

      // Connect to direct access
      setConnectionInputValue(connections, {
        targetNode: directAccessPseudoFunction,
        targetNodeReactFlowKey: directAccessId,
        findInputSlot: true,
        value: {
          reactFlowKey: indexFunctionId,
          node: indexPseudoFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: directAccessPseudoFunction,
        targetNodeReactFlowKey: directAccessId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.key, SchemaType.Source),
          node: parentSourceNode,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: directAccessPseudoFunction,
        targetNodeReactFlowKey: directAccessId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.children[0].key, SchemaType.Source),
          node: parentSourceNode.children[0],
        },
      });

      // Direct access to target
      setConnectionInputValue(connections, {
        targetNode: parentTargetNode.children[1],
        targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.children[1].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: directAccessId,
          node: directAccessPseudoFunction,
        },
      });

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('LoopingWithIndex');
      expect(rootChildren[0][1]).not.toBe('string');

      const loopingWithIndexObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['LoopingWithIndex'] as MapDefinitionEntry;
      const loopingWithIndexChildren = Object.entries(loopingWithIndexObject);
      expect(loopingWithIndexChildren.length).toEqual(1);
      expect(loopingWithIndexChildren[0][0]).toEqual('WeatherSummary');
      expect(loopingWithIndexChildren[0][1]).not.toBe('string');

      const weatherSummaryObject = loopingWithIndexObject['WeatherSummary'] as MapDefinitionEntry;
      const weatherSummaryChildren = Object.entries(weatherSummaryObject);
      expect(weatherSummaryChildren.length).toEqual(1);
      expect(weatherSummaryChildren[0][0]).toEqual('$for(/ns0:Root/LoopingWithIndex/WeatherReport, $a)');
      expect(weatherSummaryChildren[0][1]).not.toBe('string');

      const forObject = weatherSummaryObject['$for(/ns0:Root/LoopingWithIndex/WeatherReport, $a)'] as MapDefinitionEntry;
      const forChildren = Object.entries(forObject);
      expect(forChildren.length).toEqual(1);
      expect(forChildren[0][0]).toEqual('Day');
      expect(forChildren[0][1]).not.toBe('string');

      const dayObject = forObject['Day'] as MapDefinitionEntry;
      const dayChildren = Object.entries(dayObject);
      expect(dayChildren.length).toEqual(1);
      expect(dayChildren[0][0]).toEqual('Pressure');
      expect(dayChildren[0][1]).toEqual('/ns0:Root/LoopingWithIndex/WeatherReport[$a]/@Pressure');
    });

    it('Generates body with an index loop and direct index access', async () => {
      const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find(
        (child) => child.name === 'LoopingWithIndex'
      ) as SchemaNodeExtended;
      const targetNode = extendedTargetSchema.schemaTreeRoot.children.find(
        (child) => child.name === 'LoopingWithIndex'
      ) as SchemaNodeExtended;
      const directAccessId = createReactFlowFunctionKey(directAccessPseudoFunction);
      const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
      const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
      const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
      const mapDefinition: MapDefinitionEntry = {};
      const connections: ConnectionDictionary = {};

      // Just confirm the mock hasn't changed
      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      const parentSourceNode = sourceNode.children[0];
      const parentTargetNode = targetNode.children[0].children[2];

      // Parent source to index
      setConnectionInputValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: indexFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.key, SchemaType.Source),
          node: parentSourceNode,
        },
      });

      // Connect index to greater than
      setConnectionInputValue(connections, {
        targetNode: greaterThanFunction,
        targetNodeReactFlowKey: greaterThanId,
        findInputSlot: true,
        value: {
          reactFlowKey: indexFunctionId,
          node: indexPseudoFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: greaterThanFunction,
        targetNodeReactFlowKey: greaterThanId,
        inputIndex: 1,
        value: '2',
      });

      // Greater than to if
      setConnectionInputValue(connections, {
        targetNode: ifPseudoFunction,
        targetNodeReactFlowKey: ifFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: greaterThanId,
          node: greaterThanFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: ifPseudoFunction,
        targetNodeReactFlowKey: ifFunctionId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.key, SchemaType.Source),
          node: parentSourceNode,
        },
      });

      // if to target node
      setConnectionInputValue(connections, {
        targetNode: parentTargetNode,
        targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: ifFunctionId,
          node: ifPseudoFunction,
        },
      });

      // Connect to direct access
      setConnectionInputValue(connections, {
        targetNode: directAccessPseudoFunction,
        targetNodeReactFlowKey: directAccessId,
        findInputSlot: true,
        value: {
          reactFlowKey: indexFunctionId,
          node: indexPseudoFunction,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: directAccessPseudoFunction,
        targetNodeReactFlowKey: directAccessId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.key, SchemaType.Source),
          node: parentSourceNode,
        },
      });
      setConnectionInputValue(connections, {
        targetNode: directAccessPseudoFunction,
        targetNodeReactFlowKey: directAccessId,
        findInputSlot: true,
        value: {
          reactFlowKey: addReactFlowPrefix(parentSourceNode.children[0].key, SchemaType.Source),
          node: parentSourceNode.children[0],
        },
      });

      // Direct access to target
      setConnectionInputValue(connections, {
        targetNode: parentTargetNode.children[1],
        targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.children[1].key, SchemaType.Target),
        findInputSlot: true,
        value: {
          reactFlowKey: directAccessId,
          node: directAccessPseudoFunction,
        },
      });

      generateMapDefinitionBody(mapDefinition, connections);

      expect(Object.keys(mapDefinition).length).toEqual(1);
      const rootChildren = Object.entries(mapDefinition['ns0:Root']);
      expect(rootChildren.length).toEqual(1);
      expect(rootChildren[0][0]).toEqual('LoopingWithIndex');
      expect(rootChildren[0][1]).not.toBe('string');

      const loopingWithIndexObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['LoopingWithIndex'] as MapDefinitionEntry;
      const loopingWithIndexChildren = Object.entries(loopingWithIndexObject);
      expect(loopingWithIndexChildren.length).toEqual(1);
      expect(loopingWithIndexChildren[0][0]).toEqual('WeatherSummary');
      expect(loopingWithIndexChildren[0][1]).not.toBe('string');

      const weatherSummaryObject = loopingWithIndexObject['WeatherSummary'] as MapDefinitionEntry;
      const weatherSummaryChildren = Object.entries(weatherSummaryObject);
      expect(weatherSummaryChildren.length).toEqual(1);
      expect(weatherSummaryChildren[0][0]).toEqual('$for(/ns0:Root/LoopingWithIndex/WeatherReport, $a)');
      expect(weatherSummaryChildren[0][1]).not.toBe('string');

      const forObject = weatherSummaryObject['$for(/ns0:Root/LoopingWithIndex/WeatherReport, $a)'] as MapDefinitionEntry;
      const forChildren = Object.entries(forObject);
      expect(forChildren.length).toEqual(1);
      expect(forChildren[0][0]).toEqual('$if(is-greater-than($a, 2))');
      expect(forChildren[0][1]).not.toBe('string');

      const ifObject = forObject['$if(is-greater-than($a, 2))'] as MapDefinitionEntry;
      const ifChildren = Object.entries(ifObject);
      expect(ifChildren.length).toEqual(1);
      expect(ifChildren[0][0]).toEqual('Day');
      expect(ifChildren[0][1]).not.toBe('string');

      const dayObject = ifObject['Day'] as MapDefinitionEntry;
      const dayChildren = Object.entries(dayObject);
      expect(dayChildren.length).toEqual(1);
      expect(dayChildren[0][0]).toEqual('Pressure');
      expect(dayChildren[0][1]).toEqual('/ns0:Root/LoopingWithIndex/WeatherReport[$a]/@Pressure');
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
