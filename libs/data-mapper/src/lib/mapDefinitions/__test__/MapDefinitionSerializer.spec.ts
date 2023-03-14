import { addFunction, concatFunction, greaterThanFunction } from '../../__mocks__/FunctionMock';
import { reservedMapDefinitionKeys } from '../../constants/MapDefinitionConstants';
import type { MapDefinitionEntry, Schema, SchemaExtended, SchemaNodeExtended } from '../../models';
import { directAccessPseudoFunction, ifPseudoFunction, indexPseudoFunction, SchemaFileFormat, SchemaType } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import { setConnectionInputValue } from '../../utils/Connection.Utils';
import { addReactFlowPrefix, createReactFlowFunctionKey } from '../../utils/ReactFlow.Util';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { generateMapDefinitionBody, generateMapDefinitionHeader } from '../MapDefinitionSerializer';
import {
  comprehensiveSourceSchema,
  comprehensiveTargetSchema,
  sourceMockJsonSchema,
  sourceMockSchema,
  targetMockJsonSchema,
  targetMockSchema,
} from '__mocks__/schemas';

describe('mapDefinitions/MapDefinitionSerializer', () => {
  describe('XML to XML', () => {
    describe('generateMapDefinitionHeader', () => {
      const sourceSchema: Schema = sourceMockSchema;
      const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);

      const targetSchema: Schema = targetMockSchema;
      const extendedTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(targetSchema);

      it('Generates header', async () => {
        const mapDefinition: MapDefinitionEntry = {};
        generateMapDefinitionHeader(mapDefinition, extendedSourceSchema, extendedTargetSchema);

        expect(Object.keys(mapDefinition).length).toEqual(7);
        expect(mapDefinition[reservedMapDefinitionKeys.version]).toEqual('1.0');
        expect(mapDefinition[reservedMapDefinitionKeys.sourceFormat]).toEqual(SchemaFileFormat.XML);
        expect(mapDefinition[reservedMapDefinitionKeys.targetFormat]).toEqual(SchemaFileFormat.XML);
        expect(mapDefinition[reservedMapDefinitionKeys.sourceSchemaName]).toEqual('Source.xsd');
        expect(mapDefinition[reservedMapDefinitionKeys.targetSchemaName]).toEqual('Target.xsd');
        expect(mapDefinition[reservedMapDefinitionKeys.sourceNamespaces]).toBeDefined();
        expect(mapDefinition[reservedMapDefinitionKeys.targetNamespaces]).toBeDefined();
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

      it('Generates body with a property conditional', async () => {
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

        //Second property not connected to the conditional
        setConnectionInputValue(connections, {
          targetNode: targetNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[1].key, SchemaType.Target),
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
        expect(rootChildren[0][0]).toEqual('ConditionalMapping');
        expect(rootChildren[0][1]).not.toBe('string');

        const conditionalMappingObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['ConditionalMapping'] as MapDefinitionEntry;
        const conditionalMappingChildren = Object.entries(conditionalMappingObject);
        expect(conditionalMappingChildren.length).toEqual(2);
        expect(conditionalMappingChildren[0][0]).toEqual(
          '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity))'
        );
        expect(conditionalMappingChildren[0][1]).not.toBe('string');
        expect(conditionalMappingChildren[1][0]).toEqual('ItemQuantity');
        expect(conditionalMappingChildren[1][1]).toEqual('/ns0:Root/ConditionalMapping/ItemQuantity');

        const ifObject = conditionalMappingObject[
          '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity))'
        ] as MapDefinitionEntry;
        const ifChildren = Object.entries(ifObject);
        expect(ifChildren.length).toEqual(1);
        expect(ifChildren[0][0]).toEqual('ItemPrice');
        expect(ifChildren[0][1]).toEqual('/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it('Generates body with an object conditional', async () => {
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
            reactFlowKey: addReactFlowPrefix(sourceNode.key, SchemaType.Source),
            node: sourceNode,
          },
        });

        //Conditional to target
        setConnectionInputValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: ifFunctionId,
            node: ifPseudoFunction,
          },
        });

        //Child property not connected to the conditional
        setConnectionInputValue(connections, {
          targetNode: targetNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source),
            node: sourceNode.children[0],
          },
        });
        setConnectionInputValue(connections, {
          targetNode: targetNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[1].key, SchemaType.Target),
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
        expect(rootChildren[0][0]).toEqual(
          '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity))'
        );
        expect(rootChildren[0][1]).not.toBe('string');

        const ifObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)[
          '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity))'
        ] as MapDefinitionEntry;
        const ifChildren = Object.entries(ifObject);
        expect(ifChildren.length).toEqual(1);
        expect(ifChildren[0][0]).toEqual('ConditionalMapping');
        expect(ifChildren[0][1]).not.toBe('string');

        const conditionalMappingObject = ifObject['ConditionalMapping'] as MapDefinitionEntry;
        const conditionalMappingChildren = Object.entries(conditionalMappingObject);
        expect(conditionalMappingChildren.length).toEqual(2);
        expect(conditionalMappingChildren[0][0]).toEqual('ItemPrice');
        expect(conditionalMappingChildren[0][1]).toEqual('/ns0:Root/ConditionalMapping/ItemPrice');
        expect(conditionalMappingChildren[1][0]).toEqual('ItemQuantity');
        expect(conditionalMappingChildren[1][1]).toEqual('/ns0:Root/ConditionalMapping/ItemQuantity');
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
        const mockComprehensiveSourceSchema: Schema = comprehensiveSourceSchema;
        const extendedComprehensiveSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(mockComprehensiveSourceSchema);

        const mockComprehensiveTargetSchema: Schema = comprehensiveTargetSchema;
        const extendedComprehensiveTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(mockComprehensiveTargetSchema);

        const sourceNode = extendedComprehensiveSourceSchema.schemaTreeRoot.children[3].children[3]; // ManyToMany
        const targetNode = extendedComprehensiveTargetSchema.schemaTreeRoot.children[5].children[3];
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceChildNode = sourceNode.children[0]; // Simple
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
        const rootChildren = Object.entries(mapDefinition['ns0:TargetSchemaRoot']);
        expect(rootChildren.length).toEqual(1);
        expect(rootChildren[0][0]).toEqual('Looping');
        expect(rootChildren[0][1]).not.toBe('string');

        const loopingObject = (mapDefinition['ns0:TargetSchemaRoot'] as MapDefinitionEntry)['Looping'] as MapDefinitionEntry;
        const loopingEntries = Object.entries(loopingObject);
        expect(loopingEntries.length).toEqual(1);
        expect(loopingEntries[0][0]).toEqual('ManyToMany');
        expect(loopingEntries[0][1]).not.toBe('string');

        const manyToManyObject = loopingObject['ManyToMany'] as MapDefinitionEntry;
        const manyToManyEntries = Object.entries(manyToManyObject);
        expect(manyToManyEntries.length).toEqual(1);
        expect(manyToManyEntries[0][0]).toEqual('$for(/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple)');
        expect(manyToManyEntries[0][1]).not.toBe('string');

        const yearForObject = manyToManyObject['$for(/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple)'] as MapDefinitionEntry;
        const yearForLoopEntries = Object.entries(yearForObject);
        expect(yearForLoopEntries.length).toEqual(1);
        expect(yearForLoopEntries[0][0]).toEqual('Simple');
        expect(yearForLoopEntries[0][1]).not.toBe('string');

        const simpleObject = yearForObject['Simple'] as MapDefinitionEntry;
        const yearEntries = Object.entries(simpleObject);
        expect(yearEntries.length).toEqual(1);
        expect(yearEntries[0][0]).toEqual('$for(SourceSimpleChild)');
        expect(yearEntries[0][1]).not.toBe('string');

        const monthForObject = simpleObject['$for(SourceSimpleChild)'] as MapDefinitionEntry;
        const monthForLoopEntries = Object.entries(monthForObject);
        expect(monthForLoopEntries.length).toEqual(1);
        expect(monthForLoopEntries[0][0]).toEqual('SimpleChild');
        expect(monthForLoopEntries[0][1]).not.toBe('string');

        const simpleChildObject = monthForObject['SimpleChild'] as MapDefinitionEntry;
        const monthEntries = Object.entries(simpleChildObject);
        expect(monthEntries.length).toEqual(1);
        expect(monthEntries[0][0]).toEqual('$for(SourceSimpleChildChild)');
        expect(monthEntries[0][1]).not.toBe('string');

        const dayForObject = simpleChildObject['$for(SourceSimpleChildChild)'] as MapDefinitionEntry;
        const dayForLoopEntries = Object.entries(dayForObject);
        expect(dayForLoopEntries.length).toEqual(1);
        expect(dayForLoopEntries[0][0]).toEqual('SimpleChildChild');
        expect(dayForLoopEntries[0][1]).not.toBe('string');

        const simpleChildChildObject = dayForObject['SimpleChildChild'] as MapDefinitionEntry;
        const simpleChildChildEntries = Object.entries(simpleChildChildObject);
        expect(simpleChildChildEntries.length).toEqual(1);
        expect(simpleChildChildEntries[0][0]).toEqual('Direct');
        expect(simpleChildChildEntries[0][1]).toEqual('SourceDirect');
      });

      it('Generates body with many to one nested loops', async () => {
        const mockComprehensiveSourceSchema: Schema = comprehensiveSourceSchema;
        const extendedComprehensiveSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(mockComprehensiveSourceSchema);

        const mockComprehensiveTargetSchema: Schema = comprehensiveTargetSchema;
        const extendedComprehensiveTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(mockComprehensiveTargetSchema);

        const sourceNode = extendedComprehensiveSourceSchema.schemaTreeRoot.children[3].children[1]; // ManyToOne
        const targetNode = extendedComprehensiveTargetSchema.schemaTreeRoot.children[5].children[1];
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceChildNode = sourceNode.children[0]; // Simple
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
        const rootChildren = Object.entries(mapDefinition['ns0:TargetSchemaRoot']);
        expect(rootChildren.length).toEqual(1);
        expect(rootChildren[0][0]).toEqual('Looping');
        expect(rootChildren[0][1]).not.toBe('string');

        const loopingObject = (mapDefinition['ns0:TargetSchemaRoot'] as MapDefinitionEntry)['Looping'] as MapDefinitionEntry;
        const loopingEntries = Object.entries(loopingObject);
        expect(loopingEntries.length).toEqual(1);
        expect(loopingEntries[0][0]).toEqual('ManyToOne');
        expect(loopingEntries[0][1]).not.toBe('string');

        const manyToOneObject = loopingObject['ManyToOne'] as MapDefinitionEntry;
        const manyToOneEntries = Object.entries(manyToOneObject);
        expect(manyToOneEntries.length).toEqual(1);
        expect(manyToOneEntries[0][0]).toEqual('$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple)');
        expect(manyToOneEntries[0][1]).not.toBe('string');

        const yearForObject = manyToOneObject['$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple)'] as MapDefinitionEntry;
        const yearForLoopEntries = Object.entries(yearForObject);
        expect(yearForLoopEntries.length).toEqual(1);
        expect(yearForLoopEntries[0][0]).toEqual('$for(SourceSimpleChild)');
        expect(yearForLoopEntries[0][1]).not.toBe('string');

        const monthForObject = yearForObject['$for(SourceSimpleChild)'] as MapDefinitionEntry;
        const monthForLoopEntries = Object.entries(monthForObject);
        expect(monthForLoopEntries.length).toEqual(1);
        expect(monthForLoopEntries[0][0]).toEqual('$for(SourceSimpleChildChild)');
        expect(monthForLoopEntries[0][1]).not.toBe('string');

        const dayForObject = monthForObject['$for(SourceSimpleChildChild)'] as MapDefinitionEntry;
        const dayForLoopEntries = Object.entries(dayForObject);
        expect(dayForLoopEntries.length).toEqual(1);
        expect(dayForLoopEntries[0][0]).toEqual('Simple');
        expect(dayForLoopEntries[0][1]).not.toBe('string');

        const simpleChildChildObject = dayForObject['Simple'] as MapDefinitionEntry;
        const simpleChildChildEntries = Object.entries(simpleChildChildObject);
        expect(simpleChildChildEntries.length).toEqual(1);
        expect(simpleChildChildEntries[0][0]).toEqual('Direct');
        expect(simpleChildChildEntries[0][1]).toEqual('SourceDirect');
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
        const mockComprehensiveSourceSchema: Schema = comprehensiveSourceSchema;
        const extendedComprehensiveSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(mockComprehensiveSourceSchema);

        const mockComprehensiveTargetSchema: Schema = comprehensiveTargetSchema;
        const extendedComprehensiveTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(mockComprehensiveTargetSchema);

        const sourceNode = extendedComprehensiveSourceSchema.schemaTreeRoot.children[3].children[1]; // ManyToOne
        const targetNode = extendedComprehensiveTargetSchema.schemaTreeRoot.children[5].children[1];
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceChildNode = sourceNode.children[1]; // Index
        const targetChildNode = targetNode.children[1];

        const yearIndex = createReactFlowFunctionKey(indexPseudoFunction);
        const monthIndex = createReactFlowFunctionKey(indexPseudoFunction);
        const dayIndex = createReactFlowFunctionKey(indexPseudoFunction);

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
        const rootChildren = Object.entries(mapDefinition['ns0:TargetSchemaRoot']);
        expect(rootChildren.length).toEqual(1);
        expect(rootChildren[0][0]).toEqual('Looping');
        expect(rootChildren[0][1]).not.toBe('string');

        const loopingObject = (mapDefinition['ns0:TargetSchemaRoot'] as MapDefinitionEntry)['Looping'] as MapDefinitionEntry;
        const loopingEntries = Object.entries(loopingObject);
        expect(loopingEntries.length).toEqual(1);
        expect(loopingEntries[0][0]).toEqual('ManyToOne');
        expect(loopingEntries[0][1]).not.toBe('string');

        const manyToOneObject = loopingObject['ManyToOne'] as MapDefinitionEntry;
        const manyToOneEntries = Object.entries(manyToOneObject);
        expect(manyToOneEntries.length).toEqual(1);
        expect(manyToOneEntries[0][0]).toEqual('$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Index, $a)');
        expect(manyToOneEntries[0][1]).not.toBe('string');

        const yearForObject = manyToOneObject['$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Index, $a)'] as MapDefinitionEntry;
        const yearForLoopEntries = Object.entries(yearForObject);
        expect(yearForLoopEntries.length).toEqual(1);
        expect(yearForLoopEntries[0][0]).toEqual('$for(SourceIndexChild, $b)');
        expect(yearForLoopEntries[0][1]).not.toBe('string');

        const monthForObject = yearForObject['$for(SourceIndexChild, $b)'] as MapDefinitionEntry;
        const monthForLoopEntries = Object.entries(monthForObject);
        expect(monthForLoopEntries.length).toEqual(1);
        expect(monthForLoopEntries[0][0]).toEqual('$for(SourceIndexChildChild, $c)');
        expect(monthForLoopEntries[0][1]).not.toBe('string');

        const dayForObject = monthForObject['$for(SourceIndexChildChild, $c)'] as MapDefinitionEntry;
        const dayForLoopEntries = Object.entries(dayForObject);
        expect(dayForLoopEntries.length).toEqual(1);
        expect(dayForLoopEntries[0][0]).toEqual('Index');
        expect(dayForLoopEntries[0][1]).not.toBe('string');

        const simpleChildChildObject = dayForObject['Index'] as MapDefinitionEntry;
        const simpleChildChildEntries = Object.entries(simpleChildChildObject);
        expect(simpleChildChildEntries.length).toEqual(1);
        expect(simpleChildChildEntries[0][0]).toEqual('Direct');
        expect(simpleChildChildEntries[0][1]).toEqual('SourceDirect');
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
        const ifId = createReactFlowFunctionKey(ifPseudoFunction);
        const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
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

        // Conditional setup
        setConnectionInputValue(connections, {
          targetNode: parentTargetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: ifId,
            node: ifPseudoFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifId,
          findInputSlot: true,
          value: {
            reactFlowKey: greaterThanId,
            node: greaterThanFunction,
          },
        });
        setConnectionInputValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(parentSourceNode.key, SchemaType.Source),
            node: parentSourceNode,
          },
        });

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
          findInputSlot: true,
          value: '2',
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
  });

  describe('JSON to JSON', () => {
    describe('generateMapDefinitionHeader', () => {
      const sourceSchema: Schema = sourceMockJsonSchema;
      const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);

      const targetSchema: Schema = targetMockJsonSchema;
      const extendedTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(targetSchema);

      it('Generates header', async () => {
        const mapDefinition: MapDefinitionEntry = {};
        generateMapDefinitionHeader(mapDefinition, extendedSourceSchema, extendedTargetSchema);

        expect(Object.keys(mapDefinition).length).toEqual(5);
        expect(mapDefinition[reservedMapDefinitionKeys.version]).toEqual('1.0');
        expect(mapDefinition[reservedMapDefinitionKeys.sourceFormat]).toEqual(SchemaFileFormat.JSON);
        expect(mapDefinition[reservedMapDefinitionKeys.targetFormat]).toEqual(SchemaFileFormat.JSON);
        expect(mapDefinition[reservedMapDefinitionKeys.sourceSchemaName]).toEqual('SourceSchemaJson.json');
        expect(mapDefinition[reservedMapDefinitionKeys.targetSchemaName]).toEqual('TargetSchemaJson.json');
      });
    });

    describe('generateMapDefinitionBody', () => {
      const sourceSchema: Schema = sourceMockJsonSchema;
      const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);

      const targetSchema: Schema = targetMockJsonSchema;
      const extendedTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(targetSchema);

      it('Generates body with passthrough', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const sourceNode2 = rootSourceNode.children[1];

        const targetNode1 = rootTargetNode.children[0];
        const targetNode2Parent = rootTargetNode.children[1];
        const targetNode2 = targetNode2Parent.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode2.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode2.key, SchemaType.Source),
            node: sourceNode2,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        expect(rootObject[targetNode2Parent.name]).toBeDefined();
        const targetNode2ParentObject = rootObject[targetNode2Parent.name] as MapDefinitionEntry;
        expect(targetNode2ParentObject[targetNode2.name]).toEqual(sourceNode2.key);
      });

      it('Generates body with a function', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const concatFunctionId = createReactFlowFunctionKey(concatFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const sourceNode2 = rootSourceNode.children[1];

        const targetNode1 = rootTargetNode.children[0];
        const targetNode2Parent = rootTargetNode.children[1];
        const targetNode2 = targetNode2Parent.children[0];

        setConnectionInputValue(connections, {
          targetNode: concatFunction,
          targetNodeReactFlowKey: concatFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });
        setConnectionInputValue(connections, {
          targetNode: concatFunction,
          targetNodeReactFlowKey: concatFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode2.key, SchemaType.Source),
            node: sourceNode2,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: concatFunctionId,
            node: concatFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode2.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode2.key, SchemaType.Source),
            node: sourceNode2,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual('concat(/root/flowVars/username, /root/customerNumber)');

        expect(rootObject[targetNode2Parent.name]).toBeDefined();
        const targetNode2ParentObject = rootObject[targetNode2Parent.name] as MapDefinitionEntry;
        expect(targetNode2ParentObject[targetNode2.name]).toEqual(sourceNode2.key);
      });

      it('Generates body with a property conditional', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
        const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceNode1 = rootSourceNode.children[0];
        const sourceNode2 = rootSourceNode.children[6];

        const targetNode1 = rootTargetNode.children[0];
        const targetNode2 = rootTargetNode.children[9];

        // Source to greater than
        setConnectionInputValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode2.key, SchemaType.Source),
            node: sourceNode2,
          },
        });
        setConnectionInputValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          value: '10',
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
          value: '"Good"',
        });

        //Conditional to target
        setConnectionInputValue(connections, {
          targetNode: targetNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode2.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: ifFunctionId,
            node: ifPseudoFunction,
          },
        });

        //Second property not connected to the conditional
        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const ifStatement = '$if(is-greater-than(/root/Num1, 10))';
        expect(rootObject[ifStatement]).toBeDefined();
        const ifObject = rootObject[ifStatement] as MapDefinitionEntry;
        expect(ifObject[targetNode2.name]).toEqual('"Good"');
      });

      it('Generates body with an object conditional', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
        const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceNode1Parent = rootSourceNode.children[21].children[0];
        const sourceNode1 = sourceNode1Parent.children[0];

        const targetNode1Parent = rootTargetNode.children[10];
        const targetNode1 = targetNode1Parent.children[2];

        // Source to greater than
        setConnectionInputValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          value: '20',
        });
        setConnectionInputValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          value: '10',
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
            reactFlowKey: addReactFlowPrefix(sourceNode1Parent.key, SchemaType.Source),
            node: sourceNode1Parent,
          },
        });

        //Conditional to target
        setConnectionInputValue(connections, {
          targetNode: targetNode1Parent,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1Parent.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: ifFunctionId,
            node: ifPseudoFunction,
          },
        });

        //Child property
        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(1);

        const ifStatement = '$if(is-greater-than(20, 10))';
        expect(rootObject[ifStatement]).toBeDefined();
        const ifObject = rootObject[ifStatement] as MapDefinitionEntry;
        expect(ifObject[targetNode1Parent.name]).toBeDefined();

        const isStatementBadObject = ifObject[targetNode1Parent.name] as MapDefinitionEntry;
        expect(isStatementBadObject[targetNode1.name]).toEqual(sourceNode1.key);
      });

      it('Generates body with loop', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[20];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode = sourceArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode = targetArrayItemNode.children[0];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        //Add parents
        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[`$for(${sourceArrayItemNode.key})`] as MapDefinitionEntry;
        expect(actualForLoopObject.length).toEqual(1);

        const arrayElement = actualForLoopObject[0] as MapDefinitionEntry;
        expect(arrayElement[targetArrayItemPropNode.name]).toEqual(sourceArrayItemPropNode.qName);
      });

      it('Generates body with child objects loop', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[16].children[0];
        const sourceLoopChildObjectNode = sourceLoopNode.children[0];
        const sourceLoopChildObjectPropNode = sourceLoopChildObjectNode.children[0].children[1];

        const targetLoopNode = rootTargetNode.children[13].children[0];
        const targetLoopChildObjectNode = targetLoopNode.children[0];
        const targetLoopChildObjectPropNode = targetLoopChildObjectNode.children[0];

        // Add unrelated node
        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        //Add parents
        setConnectionInputValue(connections, {
          targetNode: targetLoopNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetLoopNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceLoopNode.key, SchemaType.Source),
            node: sourceLoopNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetLoopChildObjectNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetLoopChildObjectNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceLoopChildObjectNode.key, SchemaType.Source),
            node: sourceLoopChildObjectNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetLoopChildObjectPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetLoopChildObjectPropNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceLoopChildObjectPropNode.key, SchemaType.Source),
            node: sourceLoopChildObjectPropNode,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject['ForLoop'] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject['$for(/root/generalData/address)'] as MapDefinitionEntry;
        expect(actualForLoopObject.length).toEqual(1);

        const arrayElement = actualForLoopObject[0] as MapDefinitionEntry;
        const prop1Object = arrayElement[targetLoopChildObjectNode.name] as MapDefinitionEntry;
        const telNumberObject = prop1Object[targetLoopChildObjectPropNode.name] as MapDefinitionEntry;
        expect(telNumberObject).toEqual(sourceLoopChildObjectPropNode.qName);
      });

      it('Generates body with many to many nested loops', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[22].children[0];
        const sourceOuterArrayItemNode = sourceLoopNode.children[0];
        const sourceInnerArrayItemNode = sourceOuterArrayItemNode.children[0];
        const sourceInnerArrayItemPropNode = sourceInnerArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[14].children[0];
        const targetOuterArrayItemNode = targetLoopNode.children[0];
        const targetInnerArrayItemNode = targetOuterArrayItemNode.children[0];
        const targetInnerArrayItemPropNode = targetInnerArrayItemNode.children[0];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        //Add parents
        setConnectionInputValue(connections, {
          targetNode: targetOuterArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetOuterArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceOuterArrayItemNode.key, SchemaType.Source),
            node: sourceOuterArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetInnerArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetInnerArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceInnerArrayItemNode.key, SchemaType.Source),
            node: sourceInnerArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetInnerArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetInnerArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceInnerArrayItemPropNode.key, SchemaType.Source),
            node: sourceInnerArrayItemPropNode,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const madeUpObject = rootObject['TargetMadeUp'] as MapDefinitionEntry;
        const complexArrayObject = madeUpObject[targetLoopNode.qName] as MapDefinitionEntry;
        const outerArrayObject = complexArrayObject[`$for(${sourceOuterArrayItemNode.key})`] as MapDefinitionEntry;
        expect(outerArrayObject.length).toEqual(1);

        const outerArrayElement = outerArrayObject[0] as MapDefinitionEntry;
        const innerArray = `$for(${sourceInnerArrayItemNode.key.replace(`${sourceOuterArrayItemNode.key}/`, '')})`;
        const innerArrayObject = outerArrayElement[innerArray] as MapDefinitionEntry;
        expect(innerArrayObject.length).toEqual(1);
        const innerArrayElement = innerArrayObject[0] as MapDefinitionEntry;

        expect(innerArrayElement[targetInnerArrayItemPropNode.qName]).toEqual(sourceInnerArrayItemPropNode.name);
      });

      it('Generates body with many to one nested loops', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[22].children[0];
        const sourceOuterArrayItemNode = sourceLoopNode.children[0];
        const sourceInnerArrayItemNode = sourceOuterArrayItemNode.children[0];
        const sourceInnerArrayItemPropNode = sourceInnerArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode = targetArrayItemNode.children[0];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        //Add parents
        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceOuterArrayItemNode.key, SchemaType.Source),
            node: sourceOuterArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceInnerArrayItemNode.key, SchemaType.Source),
            node: sourceInnerArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceInnerArrayItemPropNode.key, SchemaType.Source),
            node: sourceInnerArrayItemPropNode,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const complexArrayObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const outerArrayObject = complexArrayObject[`$for(${sourceOuterArrayItemNode.key})`] as MapDefinitionEntry;

        const innerArray = `$for(${sourceInnerArrayItemNode.key.replace(`${sourceOuterArrayItemNode.key}/`, '')})`;
        const innerArrayObject = outerArrayObject[innerArray] as MapDefinitionEntry;
        expect(innerArrayObject.length).toEqual(1);
        const innerArrayElement = innerArrayObject[0] as MapDefinitionEntry;

        expect(innerArrayElement[targetArrayItemPropNode.qName]).toEqual(sourceInnerArrayItemPropNode.name);
      });

      it('Generates body with function loop', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const addFunctionId = createReactFlowFunctionKey(addFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[20];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode1 = sourceArrayItemNode.children[0];
        const sourceArrayItemPropNode2 = sourceArrayItemNode.children[3];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode = targetArrayItemNode.children[0];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        //Add parents
        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        //Add function
        setConnectionInputValue(connections, {
          targetNode: addFunction,
          targetNodeReactFlowKey: addFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode1.key, SchemaType.Source),
            node: sourceArrayItemPropNode1,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: addFunction,
          targetNodeReactFlowKey: addFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode2.key, SchemaType.Source),
            node: sourceArrayItemPropNode2,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addFunctionId,
            node: addFunction,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[`$for(${sourceArrayItemNode.key})`] as MapDefinitionEntry;
        expect(actualForLoopObject.length).toEqual(1);

        const arrayElement = actualForLoopObject[0] as MapDefinitionEntry;
        expect(arrayElement[targetArrayItemPropNode.name]).toEqual('add(targetQuantity, rate)');
      });

      it('Generates body with index loop', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[20];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode = sourceArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode = targetArrayItemNode.children[0];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        //Add parents
        setConnectionInputValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: indexFunctionId,
            node: indexPseudoFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[`$for(${sourceArrayItemNode.key}, $a)`] as MapDefinitionEntry;
        expect(actualForLoopObject.length).toEqual(1);

        const arrayElement = actualForLoopObject[0] as MapDefinitionEntry;
        expect(arrayElement[targetArrayItemPropNode.name]).toEqual(sourceArrayItemPropNode.qName);
      });

      it('Generates body with index and passthrough loop', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[20];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode = sourceArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode1 = targetArrayItemNode.children[0];
        const targetArrayItemPropNode2 = targetArrayItemNode.children[1];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        //Add parents
        setConnectionInputValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: indexFunctionId,
            node: indexPseudoFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode2.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: indexFunctionId,
            node: indexPseudoFunction,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[`$for(${sourceArrayItemNode.key}, $a)`] as MapDefinitionEntry;
        expect(actualForLoopObject.length).toEqual(1);

        const arrayElement = actualForLoopObject[0] as MapDefinitionEntry;
        expect(arrayElement[targetArrayItemPropNode1.name]).toEqual(sourceArrayItemPropNode.qName);
        expect(arrayElement[targetArrayItemPropNode2.name]).toEqual('$a');
      });

      it('Generates body with function and index loop', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const addFunctionId = createReactFlowFunctionKey(addFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[20];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode = sourceArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode1 = targetArrayItemNode.children[0];
        const targetArrayItemPropNode2 = targetArrayItemNode.children[1];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        //Add parents
        setConnectionInputValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: indexFunctionId,
            node: indexPseudoFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: addFunction,
          targetNodeReactFlowKey: addFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: addFunction,
          targetNodeReactFlowKey: addFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: indexFunctionId,
            node: indexPseudoFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode2.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addFunctionId,
            node: addFunction,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[`$for(${sourceArrayItemNode.key}, $a)`] as MapDefinitionEntry;
        expect(actualForLoopObject.length).toEqual(1);

        const arrayElement = actualForLoopObject[0] as MapDefinitionEntry;
        expect(arrayElement[targetArrayItemPropNode1.name]).toEqual(sourceArrayItemPropNode.qName);
        expect(arrayElement[targetArrayItemPropNode2.name]).toEqual('add(targetQuantity, $a)');
      });

      it('Generates body with many to one nested index loops', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const outerLoopIndexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const innerLoopIndexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[22].children[0];
        const sourceOuterArrayItemNode = sourceLoopNode.children[0];
        const sourceInnerArrayItemNode = sourceOuterArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode1 = targetArrayItemNode.children[0];
        const targetArrayItemPropNode2 = targetArrayItemNode.children[1];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        //Add parents
        setConnectionInputValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: outerLoopIndexFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceOuterArrayItemNode.key, SchemaType.Source),
            node: sourceOuterArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: outerLoopIndexFunctionId,
            node: indexPseudoFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: innerLoopIndexFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceInnerArrayItemNode.key, SchemaType.Source),
            node: sourceInnerArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: innerLoopIndexFunctionId,
            node: indexPseudoFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: innerLoopIndexFunctionId,
            node: indexPseudoFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode2.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: outerLoopIndexFunctionId,
            node: indexPseudoFunction,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const complexArrayObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const outerArrayObject = complexArrayObject[`$for(${sourceOuterArrayItemNode.key}, $a)`] as MapDefinitionEntry;

        const innerArray = `$for(${sourceInnerArrayItemNode.key.replace(`${sourceOuterArrayItemNode.key}/`, '')}, $b)`;
        const innerArrayObject = outerArrayObject[innerArray] as MapDefinitionEntry;
        expect(innerArrayObject.length).toEqual(1);
        const innerArrayElement = innerArrayObject[0] as MapDefinitionEntry;

        expect(innerArrayElement[targetArrayItemPropNode1.qName]).toEqual('$b');
        expect(innerArrayElement[targetArrayItemPropNode2.qName]).toEqual('$a');
      });

      it('Generates body with conditional looping', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
        const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[8];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode = sourceArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode = targetArrayItemNode.children[0];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        // Conditional
        setConnectionInputValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          value: '10',
        });

        setConnectionInputValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: greaterThanId,
            node: greaterThanFunction,
          },
        });

        // Conditional to parents
        setConnectionInputValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: ifFunctionId,
            node: ifPseudoFunction,
          },
        });

        // Child prop
        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const complexArray1Object = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const forLoopObject = complexArray1Object[`$for(${sourceArrayItemNode.key})`] as MapDefinitionEntry;
        const ifObject = forLoopObject['$if(is-greater-than(Num, 10))'] as MapDefinitionEntry;
        expect(ifObject.length).toEqual(1);

        const arrayElement = ifObject[0] as MapDefinitionEntry;
        expect(arrayElement[targetArrayItemPropNode.name]).toEqual(sourceArrayItemPropNode.qName);
      });

      it('Generates body with an index and a conditional looping', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
        const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
        const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[8];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode = sourceArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode = targetArrayItemNode.children[0];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        // Conditional
        setConnectionInputValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        // Conditional
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
          findInputSlot: true,
          value: '10',
        });

        setConnectionInputValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: greaterThanId,
            node: greaterThanFunction,
          },
        });

        // Conditional to parents
        setConnectionInputValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: indexFunctionId,
            node: indexPseudoFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: ifFunctionId,
            node: ifPseudoFunction,
          },
        });

        // Child prop
        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const complexArray1Object = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const forLoopObject = complexArray1Object[`$for(${sourceArrayItemNode.key}, $a)`] as MapDefinitionEntry;
        const ifObject = forLoopObject['$if(is-greater-than($a, 10))'] as MapDefinitionEntry;
        expect(ifObject.length).toEqual(1);

        const arrayElement = ifObject[0] as MapDefinitionEntry;
        expect(arrayElement[targetArrayItemPropNode.name]).toEqual(sourceArrayItemPropNode.qName);
      });

      it('Generates body with custom value direct index access', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const directAccessId = createReactFlowFunctionKey(directAccessPseudoFunction);
        const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[9];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode = sourceArrayItemNode.children[0];

        const targetNode1 = rootTargetNode.children[0];

        // Index
        setConnectionInputValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        // Child prop
        setConnectionInputValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          value: '1',
        });

        setConnectionInputValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: directAccessId,
            node: directAccessPseudoFunction,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(1);

        expect(rootObject[targetNode1.name]).toEqual('/root/Strings/*[1]/String');
      });

      it('Generates body with an index loop, a conditional and direct index access', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const directAccessId = createReactFlowFunctionKey(directAccessPseudoFunction);
        const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
        const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
        const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[8];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode = sourceArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode = targetArrayItemNode.children[0];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        // Conditional
        setConnectionInputValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        // Conditional
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
          findInputSlot: true,
          value: '10',
        });

        setConnectionInputValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: greaterThanId,
            node: greaterThanFunction,
          },
        });

        // Conditional to parents
        setConnectionInputValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: indexFunctionId,
            node: indexPseudoFunction,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: ifFunctionId,
            node: ifPseudoFunction,
          },
        });

        // Child prop
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
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: directAccessId,
            node: directAccessPseudoFunction,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const complexArray1Object = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const forLoopObject = complexArray1Object[`$for(${sourceArrayItemNode.key}, $a)`] as MapDefinitionEntry;
        const ifObject = forLoopObject['$if(is-greater-than($a, 10))'] as MapDefinitionEntry;
        expect(ifObject.length).toEqual(1);

        const arrayElement = ifObject[0] as MapDefinitionEntry;
        expect(arrayElement[targetArrayItemPropNode.name]).toEqual('/root/Nums/*[$a]/Num');
      });

      it('Generates body with an index loop and direct index access', async () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const directAccessId = createReactFlowFunctionKey(directAccessPseudoFunction);
        const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[8];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode = sourceArrayItemNode.children[0];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode = targetArrayItemNode.children[0];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        setConnectionInputValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceNode1.key, SchemaType.Source),
            node: sourceNode1,
          },
        });

        // Index
        setConnectionInputValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: indexFunctionId,
            node: indexPseudoFunction,
          },
        });

        // Child prop
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
            reactFlowKey: addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source),
            node: sourceArrayItemNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          value: {
            reactFlowKey: addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source),
            node: sourceArrayItemPropNode,
          },
        });

        setConnectionInputValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          value: {
            reactFlowKey: directAccessId,
            node: directAccessPseudoFunction,
          },
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const complexArray1Object = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const forLoopObject = complexArray1Object[`$for(${sourceArrayItemNode.key}, $a)`] as MapDefinitionEntry;
        expect(forLoopObject.length).toEqual(1);

        const arrayElement = forLoopObject[0] as MapDefinitionEntry;
        expect(arrayElement[targetArrayItemPropNode.name]).toEqual('/root/Nums/*[$a]/Num');
      });
    });
  });
});
