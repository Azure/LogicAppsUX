import { addFunction, concatFunction, greaterThanFunction, reverseFunction, sortFunction } from '../../__mocks__/FunctionMock';
import { reservedMapDefinitionKeys } from '../../constants/MapDefinitionConstants';
import { directAccessPseudoFunction, FunctionData, functionMock, ifPseudoFunction, indexPseudoFunction } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import {
  applyConnectionValue,
  createCustomInputConnection,
  createNewEmptyConnection,
  createNodeConnection,
} from '../../utils/Connection.Utils';
import { addReactFlowPrefix, createReactFlowFunctionKey } from '../../utils/ReactFlow.Util';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { convertToArray, createYamlFromMap, generateMapDefinitionBody, generateMapDefinitionHeader } from '../MapDefinitionSerializer';
import type { MapDefinitionEntry, Schema, SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaFileFormat, SchemaType, extend } from '@microsoft/logic-apps-shared';
import {
  deepNestedSequenceAndObject,
  comprehensiveSourceSchema,
  comprehensiveTargetSchema,
  sourceMockJsonSchema,
  sourceMockSchema,
  targetMockJsonSchema,
  targetMockSchema,
  overlappingLoopsSchema,
  playgroundSourceSchema,
  playgroundTargetSchema,
} from '../../__mocks__/schemas';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { createSchemaToSchemaNodeConnection } from './MapHandlingTestUtilis';
describe('mapDefinitions/MapDefinitionSerializer', () => {
  describe('XML to XML', () => {
    describe('generateMapDefinitionHeader', () => {
      const sourceSchema: Schema = sourceMockSchema;
      const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);

      const targetSchema: Schema = targetMockSchema;
      const extendedTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(targetSchema);

      it('Generates header', () => {
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

      it('passthrough', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children[0];
        const targetNode = extendedTargetSchema.schemaTreeRoot.children[0];
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        applyConnectionValue(connections, {
          targetNode: targetNode.children[0].children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[0], addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetNode.children[0].children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[1], addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source)),
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

      it('a custom value', () => {
        const targetNode = extendedTargetSchema.schemaTreeRoot.children[0];
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        applyConnectionValue(connections, {
          targetNode: targetNode.children[0].children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createCustomInputConnection('"CustomValue"'),
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
        expect(employeeChildren.length).toEqual(1);
        expect(employeeChildren[0][0]).toEqual('Name');
        expect(employeeChildren[0][1]).toEqual('"CustomValue"');
      });

      it('value object', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children[1].children[0];
        const targetNode = extendedTargetSchema.schemaTreeRoot.children[1].children[0];
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        applyConnectionValue(connections, {
          targetNode: targetNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[2], addReactFlowPrefix(sourceNode.children[2].key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[0], addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source)),
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

      it('a function', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children[0];
        const targetNode = extendedTargetSchema.schemaTreeRoot.children[0];
        const concatFunctionId = createReactFlowFunctionKey(concatFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        applyConnectionValue(connections, {
          targetNode: concatFunction,
          targetNodeReactFlowKey: concatFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[0], addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: concatFunction,
          targetNodeReactFlowKey: concatFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[1], addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetNode.children[0].children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(concatFunction, concatFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: targetNode.children[0].children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[1], addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source)),
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

      it('a conditional in order', () => {
        const playgroundSourceExtended = convertSchemaToSchemaExtended(playgroundSourceSchema as Schema);
        const playgroundTargetExtended = convertSchemaToSchemaExtended(playgroundTargetSchema as Schema);

        const sourceRoot = playgroundSourceExtended.schemaTreeRoot;
        const targetRoot = playgroundTargetExtended.schemaTreeRoot;

        const srcUserId = sourceRoot.children.find((child) => child.name === 'UserID') as SchemaNodeExtended;
        const tgtDecimalNumCoffeesOhAndAlsoThisNameWillBeReallyLongForTesting = targetRoot.children.find(
          (child) => child.name === 'DecimalNumCoffeesOhAndAlsoThisNameWillBeReallyLongForTesting'
        ) as SchemaNodeExtended;
        const srcBirthday = sourceRoot.children.find((child) => child.name === 'Birthday') as SchemaNodeExtended;
        const tgtRobotSpeak = targetRoot.children.find((child) => child.name === 'RobotSpeak') as SchemaNodeExtended;

        const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // sources to 'if'
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(srcUserId, addReactFlowPrefix(srcUserId.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(srcBirthday, addReactFlowPrefix(srcBirthday.key, SchemaType.Source)),
        });

        // 'if' to target
        applyConnectionValue(connections, {
          targetNode: tgtRobotSpeak,
          targetNodeReactFlowKey: addReactFlowPrefix(tgtRobotSpeak.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        // simple src to target schema
        applyConnectionValue(connections, {
          targetNode: tgtDecimalNumCoffeesOhAndAlsoThisNameWillBeReallyLongForTesting,
          targetNodeReactFlowKey: addReactFlowPrefix(
            tgtDecimalNumCoffeesOhAndAlsoThisNameWillBeReallyLongForTesting.key,
            SchemaType.Target
          ),
          findInputSlot: true,
          input: createNodeConnection(srcBirthday, addReactFlowPrefix(srcBirthday.key, SchemaType.Source)),
        });

        const targetSchemaSortArray = [
          '/ns0:TargetPlaygroundRoot',
          '/ns0:TargetPlaygroundRoot/UserID',
          '/ns0:TargetPlaygroundRoot/@UserAttribute',
          '/ns0:TargetPlaygroundRoot/Metadata',
          '/ns0:TargetPlaygroundRoot/DrinksCoffee',
          '/ns0:TargetPlaygroundRoot/NumCoffees',
          '/ns0:TargetPlaygroundRoot/IntNumCoffees',
          '/ns0:TargetPlaygroundRoot/DecimalNumCoffeesOhAndAlsoThisNameWillBeReallyLongForTesting',
          '/ns0:TargetPlaygroundRoot/RobotSpeak',
          '/ns0:TargetPlaygroundRoot/Birthday',
          '/ns0:TargetPlaygroundRoot/ItsComplicated',
        ];

        generateMapDefinitionBody(mapDefinition, connections, targetSchemaSortArray);

        const newArrPath: MapDefinitionEntry[] = [];
        const rootNodeKey = targetRoot.qName;
        const rootNode = mapDefinition[targetRoot.qName];
        convertToArray(rootNode, newArrPath);
        mapDefinition['testVal'] = 'test'; // temporary as we need two values for sort to work
        mapDefinition[rootNodeKey] = newArrPath;

        let mapstr = createYamlFromMap(mapDefinition, targetSchemaSortArray);
        mapstr = mapstr.replace('testVal: test\n', '');

        expect(mapstr).toEqual(
          'ns0:TargetPlaygroundRoot:\n  DecimalNumCoffeesOhAndAlsoThisNameWillBeReallyLongForTesting: /ns0:SourcePlaygroundRoot/Birthday\n  $if(/ns0:SourcePlaygroundRoot/UserID):\n    RobotSpeak: /ns0:SourcePlaygroundRoot/Birthday\n'
        );
      });

      it('a property conditional', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children[3];
        const targetNode = extendedTargetSchema.schemaTreeRoot.children[4];
        const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
        const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // Source to greater than
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[0], addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[1], addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source)),
        });

        // Inputs to conditional
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[0], addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source)),
        });

        //Conditional to target
        applyConnectionValue(connections, {
          targetNode: targetNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        //Second property not connected to the conditional
        applyConnectionValue(connections, {
          targetNode: targetNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[1], addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source)),
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
        expect(
          conditionalMappingChildren[0][0].startsWith(
            '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity))'
          )
        ).toBeTruthy();
        expect(conditionalMappingChildren[0][1]).not.toBe('string');
        expect(conditionalMappingChildren[1][0]).toEqual('ItemQuantity');
        expect(conditionalMappingChildren[1][1]).toEqual('/ns0:Root/ConditionalMapping/ItemQuantity');

        const ifObject = conditionalMappingObject[
          Object.keys(conditionalMappingObject).find((key) =>
            key.startsWith('$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity))')
          ) ?? ''
        ] as any as MapDefinitionEntry;
        const ifChildren = Object.entries(ifObject);
        expect(ifChildren.length).toEqual(1);
        expect(ifChildren[0][0]).toEqual('ItemPrice');
        expect(ifChildren[0][1]).toEqual('/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it.skip('an object conditional', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children[3];
        const targetNode = extendedTargetSchema.schemaTreeRoot.children[4];
        const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
        const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // Source to greater than
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[0], addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[1], addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source)),
        });

        // Inputs to conditional
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode, addReactFlowPrefix(sourceNode.key, SchemaType.Source)),
        });

        //Conditional to target
        applyConnectionValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        //Child property not connected to the conditional
        applyConnectionValue(connections, {
          targetNode: targetNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[0], addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[1], addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source)),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootChildren = Object.entries(mapDefinition['ns0:Root']);
        //expect(rootChildren.length).toEqual(1);
        expect(
          rootChildren[0][0].startsWith(
            '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity))'
          )
        ).toBeTruthy();
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

      it('loop', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
        const targetNode = extendedTargetSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // Just confirm the mock hasn't changed
        expect(sourceNode).toBeDefined();
        expect(targetNode).toBeDefined();

        const sourceEmployeeRepeatingNode = sourceNode.children[0];
        const targetPersonRepeatingNode = targetNode.children[0];

        const targetAddress = targetPersonRepeatingNode.children[1];
        const targetName = targetPersonRepeatingNode.children[0];

        const sourceName = sourceEmployeeRepeatingNode.children[1];
        const sourceTelephone = sourceEmployeeRepeatingNode.children[0];

        applyConnectionValue(connections, {
          targetNode: targetAddress,
          targetNodeReactFlowKey: addReactFlowPrefix(targetAddress.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceTelephone, addReactFlowPrefix(sourceTelephone.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetName,
          targetNodeReactFlowKey: addReactFlowPrefix(targetName.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceName, addReactFlowPrefix(sourceName.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: targetPersonRepeatingNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetPersonRepeatingNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceEmployeeRepeatingNode, addReactFlowPrefix(sourceEmployeeRepeatingNode.key, SchemaType.Source)),
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
        expect(loopingEntries[0][0].startsWith('$for(/ns0:Root/Looping/Employee)')).toBeTruthy();
        expect(loopingEntries[0][1]).not.toBe('string');

        const employeeForObject = loopingEntries[0][1] as MapDefinitionEntry;
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

      it('child objects loop', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[0], addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
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
        expect(weatherSummaryEntries[0][0].startsWith('$for(/ns0:Root/LoopingWithIndex/WeatherReport)')).toBeTruthy();
        expect(weatherSummaryEntries[0][1]).not.toBe('string');

        const forDay = weatherSummaryEntries.find((entry) => entry[0].startsWith('$for(/ns0:Root/LoopingWithIndex/WeatherReport)')) as [
          string,
          MapDefinitionEntry,
        ];
        const dayForObject = forDay[1] as MapDefinitionEntry;
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

      it('overlapping loops', () => {
        const mockOverlappingSourceSchema: Schema = overlappingLoopsSchema;
        const extendedOverlappingSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(mockOverlappingSourceSchema);

        const mockOverlappingTargetSchema: Schema = overlappingLoopsSchema;
        const extendedOverlappingTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(mockOverlappingTargetSchema);

        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // source nodes
        const outerSrcLoop = extendedOverlappingSourceSchema.schemaTreeRoot.children[0].children[0];
        const innerSrcLoop1 = outerSrcLoop.children.find((child) => child.name === 'innerLoop1') as SchemaNodeExtended;
        const innerSrcLoop1Name = innerSrcLoop1.children[0] as SchemaNodeExtended;
        const innerSrcLoop2 = outerSrcLoop.children.find((child) => child.name === 'innerLoop2') as SchemaNodeExtended;
        const innerSrcLoop2Name = innerSrcLoop2.children[0] as SchemaNodeExtended;

        // target nodes
        const outerTgtLoop = extendedOverlappingTargetSchema.schemaTreeRoot.children[0].children[0];
        const innerTgtLoop1 = outerTgtLoop.children.find((child) => child.name === 'innerLoop1') as SchemaNodeExtended;
        const innerTgtLoop1Name = innerTgtLoop1.children[0] as SchemaNodeExtended;
        const innerTgtLoop1TargetName = innerTgtLoop1.children[1] as SchemaNodeExtended;

        // parent looping connections
        applyConnectionValue(connections, {
          targetNode: outerTgtLoop,
          targetNodeReactFlowKey: addReactFlowPrefix(outerTgtLoop.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(outerSrcLoop, addReactFlowPrefix(outerSrcLoop.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: innerTgtLoop1,
          targetNodeReactFlowKey: addReactFlowPrefix(innerTgtLoop1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(innerSrcLoop1, addReactFlowPrefix(innerSrcLoop1.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: innerTgtLoop1,
          targetNodeReactFlowKey: addReactFlowPrefix(innerTgtLoop1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(innerSrcLoop1, addReactFlowPrefix(innerSrcLoop1.key, SchemaType.Source)),
        });
      });

      it('many to many nested loops', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[0], addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0].children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(
            sourceChildNode.children[0].children[0],
            addReactFlowPrefix(sourceChildNode.children[0].children[0].key, SchemaType.Source)
          ),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0].children[0].children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].children[0].children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(
            sourceChildNode.children[0].children[0].children[0],
            addReactFlowPrefix(sourceChildNode.children[0].children[0].children[0].key, SchemaType.Source)
          ),
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
        expect(manyToManyEntries[0][0].startsWith('$for(/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple)')).toBeTruthy();
        expect(manyToManyEntries[0][1]).not.toBe('string');

        const yearFor = manyToManyEntries.find((entry) => entry[0].startsWith('$for(/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple)')) as [
          string,
          MapDefinitionEntry,
        ];
        const yearForObject = yearFor[1] as MapDefinitionEntry;
        const yearForLoopEntries = Object.entries(yearForObject);
        expect(yearForLoopEntries.length).toEqual(1);
        expect(yearForLoopEntries[0][0]).toEqual('Simple');
        expect(yearForLoopEntries[0][1]).not.toBe('string');

        const simpleObject = yearForObject['Simple'] as MapDefinitionEntry;
        const yearEntries = Object.entries(simpleObject);
        expect(yearEntries.length).toEqual(1);
        expect(yearEntries[0][0].startsWith('$for(SourceSimpleChild)')).toBeTruthy();
        expect(yearEntries[0][1]).not.toBe('string');

        const monthFor = yearEntries.find((entry) => entry[0].startsWith('$for(SourceSimpleChild)')) as [string, MapDefinitionEntry];
        const monthForObject = monthFor[1] as MapDefinitionEntry;
        const monthForLoopEntries = Object.entries(monthForObject);
        expect(monthForLoopEntries.length).toEqual(1);
        expect(monthForLoopEntries[0][0]).toEqual('SimpleChild');
        expect(monthForLoopEntries[0][1]).not.toBe('string');

        const simpleChildObject = monthForObject['SimpleChild'] as MapDefinitionEntry;
        const monthEntries = Object.entries(simpleChildObject);
        expect(monthEntries.length).toEqual(1);
        expect(monthEntries[0][0].startsWith('$for(SourceSimpleChildChild)')).toBeTruthy();
        expect(monthEntries[0][1]).not.toBe('string');

        const dayFor = monthEntries.find((entry) => entry[0].startsWith('$for(SourceSimpleChildChild)')) as [string, MapDefinitionEntry];
        const dayForObject = dayFor[1] as MapDefinitionEntry;
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

      const setUpBackoutLoopTest = (
        connections: ConnectionDictionary,
        extendedComprehensiveSourceSchema: SchemaExtended,
        extendedComprehensiveTargetSchema: SchemaExtended
      ) => {
        // source nodes
        const book1Seq = extendedComprehensiveSourceSchema.schemaTreeRoot.children[0];
        const book1Title = book1Seq.children[1];
        const book2Seq = book1Seq.children[0];
        const book3Seq = book2Seq.children[0];
        const book3Name = book3Seq.children[0];
        const authObj = book2Seq.children[1];
        const authorName = authObj.children[1];
        const publisherLine1 = authObj.children[3].children[0];

        // target nodes
        const personLoop = extendedComprehensiveTargetSchema.schemaTreeRoot.children[5].children[0]; // root/looping/employee/person
        const personName = personLoop.children[0];
        const personAddress = personLoop.children[1];
        const personOther = personLoop.children[2];
        const personPublisher = personLoop.children[3];

        // add 'loop' connections
        applyConnectionValue(connections, {
          targetNode: personLoop,
          targetNodeReactFlowKey: addReactFlowPrefix(personLoop.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(book1Seq, addReactFlowPrefix(book1Seq.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: personLoop,
          targetNodeReactFlowKey: addReactFlowPrefix(personLoop.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(book2Seq, addReactFlowPrefix(book2Seq.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: personLoop,
          targetNodeReactFlowKey: addReactFlowPrefix(personLoop.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(book3Seq, addReactFlowPrefix(book3Seq.key, SchemaType.Source)),
        });

        // apply direct connections
        applyConnectionValue(connections, {
          targetNode: personPublisher,
          targetNodeReactFlowKey: addReactFlowPrefix(personPublisher.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(publisherLine1, addReactFlowPrefix(publisherLine1.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: personOther,
          targetNodeReactFlowKey: addReactFlowPrefix(personOther.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(book1Title, addReactFlowPrefix(book1Title.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: personName,
          targetNodeReactFlowKey: addReactFlowPrefix(personName.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(authorName, addReactFlowPrefix(authorName.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: personAddress,
          targetNodeReactFlowKey: addReactFlowPrefix(personAddress.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(book3Name, addReactFlowPrefix(book3Name.key, SchemaType.Source)),
        });
      };

      it('generates body using ../ to navigate out of loops', () => {
        const mockNestedTestSchema: Schema = deepNestedSequenceAndObject;
        const extendedComprehensiveSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(mockNestedTestSchema);
        const mockComprehensiveTargetSchema: Schema = targetMockSchema;
        const extendedComprehensiveTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(mockComprehensiveTargetSchema);

        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        setUpBackoutLoopTest(connections, extendedComprehensiveSourceSchema, extendedComprehensiveTargetSchema);

        generateMapDefinitionBody(mapDefinition, connections);
        const root = mapDefinition['ns0:Root'] as MapDefinitionEntry;
        const looping = root['Looping'] as MapDefinitionEntry;

        const book = (Object.entries(looping).find((entry) => entry[0].startsWith('$for')) as [string, MapDefinitionEntry])[1];
        const book2 = (Object.entries(book).find((entry) => entry[0].startsWith('$for')) as [string, MapDefinitionEntry])[1];
        const book3 = (Object.entries(book2).find((entry) => entry[0].startsWith('$for')) as [string, MapDefinitionEntry])[1];
        const person = book3['Person'] as MapDefinitionEntry;
        const address = person['Address'];
        const name = person['Name'];
        const other = person['Other'];
        const publisherLine = person['Publisher'];

        expect(address).toEqual('ns0:name');
        expect(name).toEqual('../ns0:author/ns0:first-name');
        expect(other).toEqual('../../ns0:title');
        expect(publisherLine).toEqual('../ns0:author/ns0:publisher/ns0:line1');
      });

      it("doesn't add brackets to deleted connected target nodes", () => {
        const srcDirectTranslation = extendedSourceSchema.schemaTreeRoot.children[0];
        //const srcEmployeeID = srcDirectTranslation.children.find((child) => child.name === 'EmployeeID') as SchemaNodeExtended;
        const srcEmployeeName = srcDirectTranslation.children.find((child) => child.name === 'EmployeeName') as SchemaNodeExtended;

        const tgtDirectTranslation = extendedTargetSchema.schemaTreeRoot.children[0];
        const tgtEmployee = tgtDirectTranslation.children.find((child) => child.name === 'Employee') as SchemaNodeExtended;
        const tgtID = tgtEmployee.children.find((child) => child.name === 'ID') as SchemaNodeExtended;
        const tgtName = tgtEmployee.children.find((child) => child.name === 'Name') as SchemaNodeExtended;

        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        applyConnectionValue(connections, {
          targetNode: tgtID,
          targetNodeReactFlowKey: addReactFlowPrefix(tgtID.key, SchemaType.Target),
          findInputSlot: true,
          input: createNewEmptyConnection(),
        });

        createSchemaToSchemaNodeConnection(connections, srcEmployeeName, tgtName);

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition['ns0:Root']['DirectTranslation']['Employee'])[0]).toEqual('Name');
      });

      it('many to one nested loops', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[0], addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(
            sourceChildNode.children[0].children[0],
            addReactFlowPrefix(sourceChildNode.children[0].children[0].key, SchemaType.Source)
          ),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(
            sourceChildNode.children[0].children[0].children[0],
            addReactFlowPrefix(sourceChildNode.children[0].children[0].children[0].key, SchemaType.Source)
          ),
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
        expect(manyToOneEntries[0][0].startsWith('$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple)')).toBeTruthy();
        expect(manyToOneEntries[0][1]).not.toBe('string');

        const yearForObject = manyToOneEntries[0][1] as MapDefinitionEntry;
        const yearForLoopEntries = Object.entries(yearForObject);
        expect(yearForLoopEntries.length).toEqual(1);
        expect(yearForLoopEntries[0][0].startsWith('$for(SourceSimpleChild)')).toBeTruthy();
        expect(yearForLoopEntries[0][1]).not.toBe('string');

        const monthForObject = yearForLoopEntries[0][1] as MapDefinitionEntry;
        const monthForLoopEntries = Object.entries(monthForObject);
        expect(monthForLoopEntries.length).toEqual(1);
        expect(monthForLoopEntries[0][0].startsWith('$for(SourceSimpleChildChild)')).toBeTruthy();
        expect(monthForLoopEntries[0][1]).not.toBe('string');

        const dayForObject = monthForLoopEntries[0][1] as MapDefinitionEntry;
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

      it('function loop', () => {
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

        applyConnectionValue(connections, {
          targetNode: concatFunction,
          targetNodeReactFlowKey: concatFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[0], addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: concatFunction,
          targetNodeReactFlowKey: concatFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[1], addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[2],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[2].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(concatFunction, concatFunctionId),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[1], addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source)),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootChildren = Object.entries(mapDefinition['ns0:Root']);
        expect(rootChildren.length).toEqual(1);
        expect(rootChildren[0][0]).toEqual('Looping');
        expect(rootChildren[0][1]).not.toBe('string');

        const loopObject = (mapDefinition['ns0:Root'] as MapDefinitionEntry)['Looping'] as MapDefinitionEntry;
        const loopingEntries = Object.entries(loopObject);
        loopingEntries[0][0] = loopingEntries[0][0].substring(0, 32); // remove ID for test
        expect(loopingEntries.length).toEqual(1);
        expect(loopingEntries[0][0]).toEqual('$for(/ns0:Root/Looping/Employee)');
        expect(loopingEntries[0][1]).not.toBe('string');

        const employeeForObject = loopingEntries[0][1] as MapDefinitionEntry;
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

      it('index loop', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[0], addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[1], addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source)),
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
        expect(loopingEntries[0][0].startsWith('$for(/ns0:Root/Looping/Employee, $a)')).toBeTruthy();
        expect(loopingEntries[0][1]).not.toBe('string');

        const employeeForObject = loopingEntries[0][1] as MapDefinitionEntry;
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

      it('index and passthrough loop', () => {
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
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
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
        expect(loopingEntries[0][0].startsWith('$for(/ns0:Root/Looping/Employee, $a)')).toBeTruthy();
        expect(loopingEntries[0][1]).not.toBe('string');

        const employeeForObject = loopingEntries[0][1] as MapDefinitionEntry;
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

      it('a sequence loop', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
        const targetNode = extendedTargetSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
        const sortFunctionId = createReactFlowFunctionKey(sortFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // Just confirm the mock hasn't changed
        expect(sourceNode).toBeDefined();
        expect(targetNode).toBeDefined();

        const sourceChildNode = sourceNode.children[0];
        const targetChildNode = targetNode.children[0];

        //Add parents
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[0], addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sortFunction, sortFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createCustomInputConnection('"CustomValue"'),
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
        expect(loopingEntries[0][0].startsWith('$for(sort(/ns0:Root/Looping/Employee, TelephoneNumber))')).toBeTruthy();
        expect(loopingEntries[0][1]).not.toBe('string');

        const employeeForObject = loopingEntries[0][1] as MapDefinitionEntry;
        const employeeForLoopEntries = Object.entries(employeeForObject);
        expect(employeeForLoopEntries.length).toEqual(1);
        expect(employeeForLoopEntries[0][0]).toEqual('Person');
        expect(employeeForLoopEntries[0][1]).not.toBe('string');

        const employeeObject = employeeForObject['Person'] as MapDefinitionEntry;
        const employeeObjectEntries = Object.entries(employeeObject);
        expect(employeeObjectEntries.length).toEqual(1);
        expect(employeeObjectEntries[0][0]).toEqual('Name');
        expect(employeeObjectEntries[0][1]).toEqual('"CustomValue"');
      });

      it('a sequence loop with relative path', () => {
        const sourceNameValueTransforms = extendedSourceSchema.schemaTreeRoot.children.find(
          (child) => child.name === 'NameValueTransforms'
        ) as SchemaNodeExtended;
        const srcCatalog = sourceNameValueTransforms.children.find((child) => child.name === 'Catalog') as SchemaNodeExtended;
        const srcProduct = srcCatalog.children.find((child) => child.name === 'Product') as SchemaNodeExtended;
        const srcField = srcProduct.children.find((child) => child.name === 'Field') as SchemaNodeExtended;
        const srcName = srcField.children.find((child) => child.name === 'Name') as SchemaNodeExtended;

        const targetNameValueTransforms = extendedTargetSchema.schemaTreeRoot.children.find(
          (child) => child.name === 'NameValueTransforms'
        ) as SchemaNodeExtended;
        const tgtPOStatus = targetNameValueTransforms.children.find((child) => child.name === 'PO_Status') as SchemaNodeExtended;
        const tgtProduct = tgtPOStatus.children.find((child) => child.name === 'Product') as SchemaNodeExtended;
        const tgtOrderStatusQuantity = tgtProduct.children.find((child) => child.name === 'OrderStatusQuantity') as SchemaNodeExtended;
        const tgtProductQuantity = tgtOrderStatusQuantity.children.find((child) => child.name === 'ProductQuantity') as SchemaNodeExtended;

        const reverseFunctionId = createReactFlowFunctionKey(reverseFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // connect parents
        createSchemaToSchemaNodeConnection(connections, srcProduct, tgtProduct);

        // child connection under sequence
        createSchemaToSchemaNodeConnection(connections, srcName, tgtProductQuantity);

        // connect sequence fn
        applyConnectionValue(connections, {
          targetNode: reverseFunction,
          targetNodeReactFlowKey: reverseFunctionId,
          findInputSlot: true,
          input: createNodeConnection(srcField, addReactFlowPrefix(srcField.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: tgtOrderStatusQuantity,
          targetNodeReactFlowKey: addReactFlowPrefix(tgtOrderStatusQuantity.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(reverseFunction, reverseFunctionId),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);

        const rootChildren = Object.entries(mapDefinition['ns0:Root']);
        expect(rootChildren.length).toEqual(1);
        expect(rootChildren[0][0]).toEqual('NameValueTransforms');

        const parentLoopObject = ((mapDefinition['ns0:Root'] as MapDefinitionEntry)['NameValueTransforms'] as MapDefinitionEntry)[
          'PO_Status'
        ] as MapDefinitionEntry;
        const loopingEntries = Object.entries(parentLoopObject);
        expect(loopingEntries.length).toEqual(1);
        expect(loopingEntries[0][0].startsWith('$for(/ns0:Root/NameValueTransforms/Catalog/Product)')).toBeTruthy();

        const product = loopingEntries[0][1] as MapDefinitionEntry;

        expect(loopingEntries[0][1]).not.toBe('string');
        expect(Object.keys(product['Product'])[0].startsWith('$for(reverse(Field))')).toBeTruthy();

        const orderStatusQuantity = Object.entries(product['Product'] as MapDefinitionEntry)[0][1] as MapDefinitionEntry;

        expect(orderStatusQuantity['OrderStatusQuantity']['ProductQuantity']).toEqual('Name');
      });

      it.skip('a sequence loop and function below it', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
        const targetNode = extendedTargetSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;

        const reverseFunction = functionMock.find((fn) => fn.key === 'Reverse') as FunctionData;
        const reverseFunctionKey = createReactFlowFunctionKey(reverseFunction);

        const toLowerFunction = functionMock.find((fn) => fn.key === 'ToLower') as FunctionData;
        const toLowerFunctionKey = createReactFlowFunctionKey(toLowerFunction);

        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // Just confirm the mock hasn't changed
        expect(sourceNode).toBeDefined();
        expect(targetNode).toBeDefined();

        const repeatingSourceNode = sourceNode.children[0];
        const repeatingTargetNode = targetNode.children[0];

        const nameSourceNode = repeatingSourceNode.children[1];
        const nameTargetNode = repeatingTargetNode.children[0];

        //Add parents
        applyConnectionValue(connections, {
          targetNode: reverseFunction,
          targetNodeReactFlowKey: reverseFunctionKey,
          findInputSlot: true,
          input: {
            reactFlowKey: addReactFlowPrefix(repeatingSourceNode.key, SchemaType.Source),
            node: repeatingSourceNode,
          },
        });

        applyConnectionValue(connections, {
          targetNode: repeatingTargetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(repeatingTargetNode.key, SchemaType.Target),
          findInputSlot: true,
          input: {
            reactFlowKey: reverseFunctionKey,
            node: reverseFunction,
          },
        });

        // add children
        applyConnectionValue(connections, {
          targetNode: toLowerFunction,
          targetNodeReactFlowKey: toLowerFunctionKey,
          findInputSlot: true,
          input: {
            reactFlowKey: addReactFlowPrefix(nameSourceNode.key, SchemaType.Source),
            node: nameSourceNode,
          },
        });
        applyConnectionValue(connections, {
          targetNode: nameTargetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(nameTargetNode.key, SchemaType.Target),
          findInputSlot: true,
          input: {
            reactFlowKey: toLowerFunctionKey,
            node: toLowerFunction,
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
        expect(loopingEntries[0][0]).toEqual('$for(reverse(/ns0:Root/Looping/Employee))');

        const employeeForObject = loopObject['$for(reverse(/ns0:Root/Looping/Employee))'] as MapDefinitionEntry;
        const employeeForLoopEntries = Object.entries(employeeForObject);
        expect(employeeForLoopEntries.length).toEqual(1);
        expect(employeeForLoopEntries[0][0]).toEqual('Person');
        expect(employeeForLoopEntries[0][1]).not.toBe('string');

        const employeeObject = employeeForObject['Person'] as MapDefinitionEntry;
        const employeeObjectEntries = Object.entries(employeeObject);
        expect(employeeObjectEntries.length).toEqual(1);
        expect(employeeObjectEntries[0][0]).toEqual('Name');
        expect(employeeObjectEntries[0][1]).toEqual('"CustomValue"');
      });

      it('a sequence and an index loop', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
        const targetNode = extendedTargetSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
        const sortFunctionId = createReactFlowFunctionKey(sortFunction);
        const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // Just confirm the mock hasn't changed
        expect(sourceNode).toBeDefined();
        expect(targetNode).toBeDefined();

        const sourceChildNode = sourceNode.children[0];
        const targetChildNode = targetNode.children[0];

        //Add parents
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[0], addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sortFunction, sortFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
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
        expect(loopingEntries[0][0].startsWith('$for(sort(/ns0:Root/Looping/Employee, TelephoneNumber), $a)')).toBeTruthy();
        expect(loopingEntries[0][1]).not.toBe('string');

        const employeeForObject = loopingEntries[0][1] as MapDefinitionEntry;
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

      it('2 sequences and an index loop', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
        const targetNode = extendedTargetSchema.schemaTreeRoot.children.find((child) => child.name === 'Looping') as SchemaNodeExtended;
        const sortFunctionId1 = createReactFlowFunctionKey(sortFunction);
        const sortFunctionId2 = createReactFlowFunctionKey(sortFunction);
        const indexFunctionId = createReactFlowFunctionKey(indexPseudoFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // Just confirm the mock hasn't changed
        expect(sourceNode).toBeDefined();
        expect(targetNode).toBeDefined();

        const sourceChildNode = sourceNode.children[0];
        const targetChildNode = targetNode.children[0];

        //Add parents
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId1,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId1,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[0], addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId2,
          findInputSlot: true,
          input: createNodeConnection(sortFunction, sortFunctionId1),
        });
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId2,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[1], addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sortFunction, sortFunctionId2),
        });

        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
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
        expect(loopingEntries[0][0].startsWith('$for(sort(sort(/ns0:Root/Looping/Employee, TelephoneNumber), Name), $a)')).toBeTruthy();
        expect(loopingEntries[0][1]).not.toBe('string');

        const employeeForObject = loopingEntries[0][1] as MapDefinitionEntry;
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

      it('function and index loop', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[0], addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: concatFunction,
          targetNodeReactFlowKey: concatFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[1], addReactFlowPrefix(sourceChildNode.children[1].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: concatFunction,
          targetNodeReactFlowKey: concatFunctionId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(concatFunction, concatFunctionId),
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
        expect(loopingEntries[0][0].startsWith('$for(/ns0:Root/Looping/Employee, $a)')).toBeTruthy();
        expect(loopingEntries[0][1]).not.toBe('string');

        const employeeForObject = loopingEntries[0][1] as MapDefinitionEntry;
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

      it('many to one nested index loops', () => {
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

        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: yearIndex,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode, addReactFlowPrefix(sourceChildNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, yearIndex),
        });

        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: monthIndex,
          findInputSlot: true,
          input: createNodeConnection(sourceChildNode.children[0], addReactFlowPrefix(sourceChildNode.children[0].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, monthIndex),
        });

        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: dayIndex,
          findInputSlot: true,
          input: createNodeConnection(
            sourceChildNode.children[0].children[0],
            addReactFlowPrefix(sourceChildNode.children[0].children[0].key, SchemaType.Source)
          ),
        });
        applyConnectionValue(connections, {
          targetNode: targetChildNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, dayIndex),
        });

        applyConnectionValue(connections, {
          targetNode: targetChildNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetChildNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(
            sourceChildNode.children[0].children[0].children[0],
            addReactFlowPrefix(sourceChildNode.children[0].children[0].children[0].key, SchemaType.Source)
          ),
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
        expect(manyToOneEntries[0][0].startsWith('$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Index, $a)')).toBeTruthy();
        expect(manyToOneEntries[0][1]).not.toBe('string');

        const yearForObject = manyToOneEntries[0][1] as MapDefinitionEntry;
        const yearForLoopEntries = Object.entries(yearForObject);
        expect(yearForLoopEntries.length).toEqual(1);
        expect(yearForLoopEntries[0][0].startsWith('$for(SourceIndexChild, $b)')).toBeTruthy();
        expect(yearForLoopEntries[0][1]).not.toBe('string');

        const monthForObject = yearForLoopEntries[0][1] as MapDefinitionEntry;
        const monthForLoopEntries = Object.entries(monthForObject);
        expect(monthForLoopEntries.length).toEqual(1);
        expect(monthForLoopEntries[0][0].startsWith('$for(SourceIndexChildChild, $c)')).toBeTruthy();
        expect(monthForLoopEntries[0][1]).not.toBe('string');

        const dayForObject = monthForLoopEntries[0][1] as MapDefinitionEntry;
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

      it('conditional looping', () => {
        const sourceNode = extendedSourceSchema.schemaTreeRoot.children[5].children[0].children[0];
        const targetNode = extendedTargetSchema.schemaTreeRoot.children[6].children[0];
        const ifFunctionId = createReactFlowFunctionKey(ifPseudoFunction);
        const greaterThanId = createReactFlowFunctionKey(greaterThanFunction);
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        // Source to greater than
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[0], addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[1], addReactFlowPrefix(sourceNode.children[1].key, SchemaType.Source)),
        });

        // Inputs to conditional
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode, addReactFlowPrefix(sourceNode.key, SchemaType.Source)),
        });

        //Conditional to target
        applyConnectionValue(connections, {
          targetNode: targetNode.children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        //Properties connection
        applyConnectionValue(connections, {
          targetNode: targetNode.children[0].children[0],
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.children[0].children[0].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode.children[0], addReactFlowPrefix(sourceNode.children[0].key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode, addReactFlowPrefix(sourceNode.key, SchemaType.Source)),
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
        expect(conditionalLoopingChildren[0][0].startsWith('$for(/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product)')).toBeTruthy();
        expect(conditionalLoopingChildren[0][1]).not.toBe('string');

        const forObject = conditionalLoopingChildren[0][1] as MapDefinitionEntry;
        const forChildren = Object.entries(forObject);
        expect(forChildren.length).toEqual(1);
        expect(forChildren[0][0]).toEqual('CategorizedCatalog');
        expect(forChildren[0][1]).not.toBe('string');

        const categorizedCatalogObject = forObject['CategorizedCatalog'] as MapDefinitionEntry;
        const categorizedCatalogChildren = Object.entries(categorizedCatalogObject);
        expect(categorizedCatalogChildren.length).toEqual(1);
        expect(categorizedCatalogChildren[0][0].startsWith('$if(is-greater-than(Name, SKU))')).toBeTruthy();
        expect(categorizedCatalogChildren[0][1]).not.toBe('string');

        const ifObject = categorizedCatalogChildren[0][1] as MapDefinitionEntry;
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

      it('an index and a conditional looping', () => {
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
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(parentSourceNode, addReactFlowPrefix(parentSourceNode.key, SchemaType.Source)),
        });

        // Index to Greater than
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          inputIndex: 1,
          input: createCustomInputConnection('10'),
        });

        // Greater than and source parent to if
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(parentSourceNode, addReactFlowPrefix(parentSourceNode.key, SchemaType.Source)),
        });

        // If to parent target
        applyConnectionValue(connections, {
          targetNode: parentTargetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        // Property source to target
        applyConnectionValue(connections, {
          targetNode: parentTargetNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(
            parentSourceNode.children[0],
            addReactFlowPrefix(parentSourceNode.children[0].key, SchemaType.Source)
          ),
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
        expect(weatherSummaryChildren[0][0].startsWith('$for(/ns0:Root/LoopingWithIndex/WeatherReport, $a)')).toBeTruthy();
        expect(weatherSummaryChildren[0][1]).not.toBe('string');

        const forObject = weatherSummaryChildren[0][1] as MapDefinitionEntry;
        const forChildren = Object.entries(forObject);
        expect(forChildren.length).toEqual(1);
        expect(forChildren[0][0].startsWith('$if(is-greater-than($a, 10))')).toBeTruthy();
        expect(forChildren[0][1]).not.toBe('string');

        const ifObject = forChildren[0][1] as MapDefinitionEntry;
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

      it('custom value direct index access', () => {
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
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          inputIndex: 0,
          input: createCustomInputConnection('1'),
        });
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(parentSourceNode, addReactFlowPrefix(parentSourceNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(
            parentSourceNode.children[0],
            addReactFlowPrefix(parentSourceNode.children[0].key, SchemaType.Source)
          ),
        });

        // Direct access to target
        applyConnectionValue(connections, {
          targetNode: parentTargetNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(directAccessPseudoFunction, directAccessId),
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

      it('an index loop, a conditional and direct index access', () => {
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
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(parentSourceNode, addReactFlowPrefix(parentSourceNode.key, SchemaType.Source)),
        });

        // Connect index to parent target
        applyConnectionValue(connections, {
          targetNode: parentTargetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        // Connect to direct access
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(parentSourceNode, addReactFlowPrefix(parentSourceNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(
            parentSourceNode.children[0],
            addReactFlowPrefix(parentSourceNode.children[0].key, SchemaType.Source)
          ),
        });

        // Direct access to target
        applyConnectionValue(connections, {
          targetNode: parentTargetNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(directAccessPseudoFunction, directAccessId),
        });

        // Conditional setup
        applyConnectionValue(connections, {
          targetNode: parentTargetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifId),
        });

        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifId,
          findInputSlot: true,
          input: createNodeConnection(parentSourceNode, addReactFlowPrefix(parentSourceNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createCustomInputConnection('2'),
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
        expect(weatherSummaryChildren[0][0].startsWith('$for(/ns0:Root/LoopingWithIndex/WeatherReport, $a)')).toBeTruthy();
        expect(weatherSummaryChildren[0][1]).not.toBe('string');

        const forObject = weatherSummaryChildren[0][1] as MapDefinitionEntry;
        const forChildren = Object.entries(forObject);
        expect(forChildren.length).toEqual(1);
        expect(forChildren[0][0].startsWith('$if(is-greater-than($a, 2))')).toBeTruthy();
        expect(forChildren[0][1]).not.toBe('string');

        const ifObject = forChildren[0][1] as MapDefinitionEntry;
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

      it('an index loop and direct index access', () => {
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
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(parentSourceNode, addReactFlowPrefix(parentSourceNode.key, SchemaType.Source)),
        });

        // Connect index to greater than
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          inputIndex: 1,
          input: createCustomInputConnection('2'),
        });

        // Greater than to if
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(parentSourceNode, addReactFlowPrefix(parentSourceNode.key, SchemaType.Source)),
        });

        // if to target node
        applyConnectionValue(connections, {
          targetNode: parentTargetNode,
          targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        // Connect to direct access
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(parentSourceNode, addReactFlowPrefix(parentSourceNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(
            parentSourceNode.children[0],
            addReactFlowPrefix(parentSourceNode.children[0].key, SchemaType.Source)
          ),
        });

        // Direct access to target
        applyConnectionValue(connections, {
          targetNode: parentTargetNode.children[1],
          targetNodeReactFlowKey: addReactFlowPrefix(parentTargetNode.children[1].key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(directAccessPseudoFunction, directAccessId),
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
        expect(weatherSummaryChildren[0][0].startsWith('$for(/ns0:Root/LoopingWithIndex/WeatherReport, $a)')).toBeTruthy();
        expect(weatherSummaryChildren[0][1]).not.toBe('string');

        const forObject = weatherSummaryChildren[0][1] as MapDefinitionEntry;
        const forChildren = Object.entries(forObject);
        expect(forChildren.length).toEqual(1);
        expect(forChildren[0][0].startsWith('$if(is-greater-than($a, 2))')).toBeTruthy();
        expect(forChildren[0][1]).not.toBe('string');

        const ifObject = forChildren[0][1] as MapDefinitionEntry;
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

      it('Generates header', () => {
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

      it('passthrough', () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const sourceNode2 = rootSourceNode.children[1];

        const targetNode1 = rootTargetNode.children[0];
        const targetNode2Parent = rootTargetNode.children[1];
        const targetNode2 = targetNode2Parent.children[0];

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode2.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode2, addReactFlowPrefix(sourceNode2.key, SchemaType.Source)),
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

      it('a function', () => {
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

        applyConnectionValue(connections, {
          targetNode: concatFunction,
          targetNodeReactFlowKey: concatFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: concatFunction,
          targetNodeReactFlowKey: concatFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode2, addReactFlowPrefix(sourceNode2.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(concatFunction, concatFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode2.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode2, addReactFlowPrefix(sourceNode2.key, SchemaType.Source)),
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

      it.skip('a property conditional', () => {
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
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode2, addReactFlowPrefix(sourceNode2.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createCustomInputConnection('10'),
        });

        // Inputs to conditional
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createCustomInputConnection('"Good"'),
        });

        //Conditional to target
        applyConnectionValue(connections, {
          targetNode: targetNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode2.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        //Second property not connected to the conditional
        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
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

      it.skip('an object conditional', () => {
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
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createCustomInputConnection('20'),
        });
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createCustomInputConnection('10'),
        });

        // Inputs to conditional
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceNode1Parent, addReactFlowPrefix(sourceNode1Parent.key, SchemaType.Source)),
        });

        //Conditional to target
        applyConnectionValue(connections, {
          targetNode: targetNode1Parent,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1Parent.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        //Child property
        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
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

      it('loop', () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[20];
        const sourceArrayItemNode = sourceLoopNode.children[0];
        const sourceArrayItemPropNode1 = sourceArrayItemNode.children[0];
        const sourceArrayItemPropNode2 = sourceArrayItemNode.children[1];

        const targetLoopNode = rootTargetNode.children[3];
        const targetArrayItemNode = targetLoopNode.children[0];
        const targetArrayItemPropNode1 = targetArrayItemNode.children[0];
        const targetArrayItemPropNode2 = targetArrayItemNode.children[1];

        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode1, addReactFlowPrefix(sourceArrayItemPropNode1.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode2.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode2, addReactFlowPrefix(sourceArrayItemPropNode2.key, SchemaType.Source)),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = (
          Object.entries(forLoopObject).find((entry) => entry[0].startsWith(`$for(${sourceArrayItemNode.key})`)) as [
            string,
            MapDefinitionEntry,
          ]
        )[1];
        const actualForLoopObjectKeys = Object.keys(actualForLoopObject);
        expect(actualForLoopObjectKeys.length).toEqual(2);

        expect(actualForLoopObject[targetArrayItemPropNode1.name]).toEqual(sourceArrayItemPropNode1.qName);
        expect(actualForLoopObject[targetArrayItemPropNode2.name]).toEqual(sourceArrayItemPropNode2.qName);
      });

      it.skip('child objects loop', () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const mapDefinition: MapDefinitionEntry = {};
        const connections: ConnectionDictionary = {};

        const sourceLoopNode = rootSourceNode.children[16].children[0];
        const sourceLoopChildObjectNode = sourceLoopNode.children[0];
        const sourceLoopChildObjectPropNode1 = sourceLoopChildObjectNode.children[0].children[1];
        const sourceLoopChildObjectPropNode2 = sourceLoopChildObjectNode.children[0].children[2];

        const targetLoopNode = rootTargetNode.children[13].children[0];
        const targetLoopChildObjectNode = targetLoopNode.children[0];
        const targetLoopChildObjectPropNode1 = targetLoopChildObjectNode.children[0];
        const targetLoopChildObjectPropNode2 = targetLoopChildObjectNode.children[1];

        // Add unrelated node
        const sourceNode1 = rootSourceNode.children[0].children[0];
        const targetNode1 = rootTargetNode.children[0];

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: targetLoopNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetLoopNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceLoopNode, addReactFlowPrefix(sourceLoopNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetLoopChildObjectNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetLoopChildObjectNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceLoopChildObjectNode, addReactFlowPrefix(sourceLoopChildObjectNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetLoopChildObjectPropNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetLoopChildObjectPropNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(
            sourceLoopChildObjectPropNode1,
            addReactFlowPrefix(sourceLoopChildObjectPropNode1.key, SchemaType.Source)
          ),
        });

        applyConnectionValue(connections, {
          targetNode: targetLoopChildObjectPropNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetLoopChildObjectPropNode2.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(
            sourceLoopChildObjectPropNode2,
            addReactFlowPrefix(sourceLoopChildObjectPropNode2.key, SchemaType.Source)
          ),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject['ForLoop'] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject['$for(/root/generalData/address)'] as MapDefinitionEntry;
        const actualForLoopObjectKeys = Object.keys(actualForLoopObject);
        expect(actualForLoopObjectKeys.length).toEqual(1);

        const prop1Object = actualForLoopObject[targetLoopChildObjectNode.name] as MapDefinitionEntry;

        const telNumberObject = prop1Object[targetLoopChildObjectPropNode1.name] as MapDefinitionEntry;
        expect(telNumberObject).toEqual(sourceLoopChildObjectPropNode1.qName);

        const extObject = prop1Object[targetLoopChildObjectPropNode2.name] as MapDefinitionEntry;
        expect(extObject).toEqual(sourceLoopChildObjectPropNode2.qName);
      });

      it.skip('many to many nested loops', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: targetOuterArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetOuterArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceOuterArrayItemNode, addReactFlowPrefix(sourceOuterArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetInnerArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetInnerArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceInnerArrayItemNode, addReactFlowPrefix(sourceInnerArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetInnerArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetInnerArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(
            sourceInnerArrayItemPropNode,
            addReactFlowPrefix(sourceInnerArrayItemPropNode.key, SchemaType.Source)
          ),
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
        const outerArrayObjectKeys = Object.keys(outerArrayObject);
        expect(outerArrayObjectKeys.length).toEqual(1);

        const innerArray = `$for(${sourceInnerArrayItemNode.key.replace(`${sourceOuterArrayItemNode.key}/`, '')})`;
        const innerArrayObject = outerArrayObject[innerArray] as MapDefinitionEntry;
        const innerArrayObjectKeys = Object.keys(innerArrayObject);
        expect(innerArrayObjectKeys.length).toEqual(1);

        expect(innerArrayObject[targetInnerArrayItemPropNode.qName]).toEqual(sourceInnerArrayItemPropNode.name);
      });

      it.skip('many to one nested loops', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceOuterArrayItemNode, addReactFlowPrefix(sourceOuterArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceInnerArrayItemNode, addReactFlowPrefix(sourceInnerArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(
            sourceInnerArrayItemPropNode,
            addReactFlowPrefix(sourceInnerArrayItemPropNode.key, SchemaType.Source)
          ),
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
        const innerArrayObjectKeys = Object.keys(innerArrayObject);
        expect(innerArrayObjectKeys.length).toEqual(1);

        expect(innerArrayObject[targetArrayItemPropNode.qName]).toEqual(sourceInnerArrayItemPropNode.name);
      });

      it.skip('function loop', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        //Add function
        applyConnectionValue(connections, {
          targetNode: addFunction,
          targetNodeReactFlowKey: addFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode1, addReactFlowPrefix(sourceArrayItemPropNode1.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: addFunction,
          targetNodeReactFlowKey: addFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode2, addReactFlowPrefix(sourceArrayItemPropNode2.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(addFunction, addFunctionId),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[`$for(${sourceArrayItemNode.key})`] as MapDefinitionEntry;
        const actualForLoopObjectKeys = Object.keys(actualForLoopObject);
        expect(actualForLoopObjectKeys.length).toEqual(1);

        expect(actualForLoopObject[targetArrayItemPropNode.name]).toEqual('add(targetQuantity, rate)');
      });

      it.skip('index loop', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[`$for(${sourceArrayItemNode.key}, $a)`] as MapDefinitionEntry;
        const actualForLoopObjectKeys = Object.keys(actualForLoopObject);
        expect(actualForLoopObjectKeys.length).toEqual(1);

        expect(actualForLoopObject[targetArrayItemPropNode.name]).toEqual(sourceArrayItemPropNode.qName);
      });

      it.skip('index and passthrough loop', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode2.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[`$for(${sourceArrayItemNode.key}, $a)`] as MapDefinitionEntry;
        const actualForLoopObjectKeys = Object.keys(actualForLoopObject);
        expect(actualForLoopObjectKeys.length).toEqual(2);

        expect(actualForLoopObject[targetArrayItemPropNode1.name]).toEqual(sourceArrayItemPropNode.qName);
        expect(actualForLoopObject[targetArrayItemPropNode2.name]).toEqual('$a');
      });

      it.skip('a sequence loop', () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const sortFunctionId = createReactFlowFunctionKey(sortFunction);
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sortFunction, sortFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[
          `$for(sort(${sourceArrayItemNode.key}, ${sourceArrayItemPropNode.name}))`
        ] as MapDefinitionEntry;
        const actualForLoopObjectKeys = Object.keys(actualForLoopObject);
        expect(actualForLoopObjectKeys.length).toEqual(1);

        expect(actualForLoopObject[targetArrayItemPropNode.name]).toEqual(sourceArrayItemPropNode.qName);
      });

      it.skip('a sequence and index loop', () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const sortFunctionId = createReactFlowFunctionKey(sortFunction);
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sortFunction, sortFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode2.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[
          `$for(sort(${sourceArrayItemNode.key}, ${sourceArrayItemPropNode.name}), $a)`
        ] as MapDefinitionEntry;
        const actualForLoopObjectKeys = Object.keys(actualForLoopObject);
        expect(actualForLoopObjectKeys.length).toEqual(2);

        expect(actualForLoopObject[targetArrayItemPropNode1.name]).toEqual(sourceArrayItemPropNode.qName);
        expect(actualForLoopObject[targetArrayItemPropNode2.name]).toEqual('$a');
      });

      it.skip('2 sequences and index loop', () => {
        const rootSourceNode = extendedSourceSchema.schemaTreeRoot;
        const rootTargetNode = extendedTargetSchema.schemaTreeRoot;
        const sortFunctionId1 = createReactFlowFunctionKey(sortFunction);
        const sortFunctionId2 = createReactFlowFunctionKey(sortFunction);
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId1,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId1,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId2,
          findInputSlot: true,
          input: createNodeConnection(sortFunction, sortFunctionId1),
        });
        applyConnectionValue(connections, {
          targetNode: sortFunction,
          targetNodeReactFlowKey: sortFunctionId2,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sortFunction, sortFunctionId2),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode2.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[
          `$for(sort(sort(${sourceArrayItemNode.key}, ${sourceArrayItemPropNode.name}), ${sourceArrayItemPropNode.name}), $a)`
        ] as MapDefinitionEntry;
        const actualForLoopObjectKeys = Object.keys(actualForLoopObject);
        expect(actualForLoopObjectKeys.length).toEqual(2);

        expect(actualForLoopObject[targetArrayItemPropNode1.name]).toEqual(sourceArrayItemPropNode.qName);
        expect(actualForLoopObject[targetArrayItemPropNode2.name]).toEqual('$a');
      });

      it.skip('function and index loop', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: addFunction,
          targetNodeReactFlowKey: addFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: addFunction,
          targetNodeReactFlowKey: addFunctionId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode2.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(addFunction, addFunctionId),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const forLoopObject = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const actualForLoopObject = forLoopObject[`$for(${sourceArrayItemNode.key}, $a)`] as MapDefinitionEntry;
        const actualForLoopObjectKeys = Object.keys(actualForLoopObject);
        expect(actualForLoopObjectKeys.length).toEqual(2);

        expect(actualForLoopObject[targetArrayItemPropNode1.name]).toEqual(sourceArrayItemPropNode.qName);
        expect(actualForLoopObject[targetArrayItemPropNode2.name]).toEqual('add(targetQuantity, $a)');
      });

      it.skip('many to one nested index loops', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        //Add parents
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: outerLoopIndexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceOuterArrayItemNode, addReactFlowPrefix(sourceOuterArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, outerLoopIndexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: innerLoopIndexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceInnerArrayItemNode, addReactFlowPrefix(sourceInnerArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, innerLoopIndexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, innerLoopIndexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode2,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode2.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, outerLoopIndexFunctionId),
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
        const innerArrayObjectKeys = Object.keys(innerArrayObject);
        expect(innerArrayObjectKeys.length).toEqual(2);

        expect(innerArrayObject[targetArrayItemPropNode1.qName]).toEqual('$b');
        expect(innerArrayObject[targetArrayItemPropNode2.qName]).toEqual('$a');
      });

      it.skip('conditional looping', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        // Conditional
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createCustomInputConnection('10'),
        });

        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });

        // Conditional to parents
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        // Child prop
        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
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
        const ifObjectKeys = Object.keys(ifObject);
        expect(ifObjectKeys.length).toEqual(1);

        expect(ifObject[targetArrayItemPropNode.name]).toEqual(sourceArrayItemPropNode.qName);
      });

      it.skip('an index and a conditional looping', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        // Conditional
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        // Conditional
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createCustomInputConnection('10'),
        });

        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });

        // Conditional to parents
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        // Child prop
        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
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
        const ifObjectKeys = Object.keys(ifObject);
        expect(ifObjectKeys.length).toEqual(1);

        expect(ifObject[targetArrayItemPropNode.name]).toEqual(sourceArrayItemPropNode.qName);
      });

      it.skip('custom value direct index access', () => {
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
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        // Child prop
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createCustomInputConnection('1'),
        });

        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(directAccessPseudoFunction, directAccessId),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(1);

        expect(rootObject[targetNode1.name]).toEqual('/root/Strings/*[1]/String');
      });

      it.skip('an index loop, a conditional and direct index access', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        // Conditional
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        // Conditional
        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: greaterThanFunction,
          targetNodeReactFlowKey: greaterThanId,
          findInputSlot: true,
          input: createCustomInputConnection('10'),
        });

        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(greaterThanFunction, greaterThanId),
        });

        // Conditional to parents
        applyConnectionValue(connections, {
          targetNode: ifPseudoFunction,
          targetNodeReactFlowKey: ifFunctionId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(ifPseudoFunction, ifFunctionId),
        });

        // Child prop
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(directAccessPseudoFunction, directAccessId),
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
        const ifObjectKeys = Object.keys(ifObject);
        expect(ifObjectKeys.length).toEqual(1);

        expect(ifObject[targetArrayItemPropNode.name]).toEqual('/root/Nums/*[$a]/Num');
      });

      it.skip('an index loop and direct index access', () => {
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

        applyConnectionValue(connections, {
          targetNode: targetNode1,
          targetNodeReactFlowKey: addReactFlowPrefix(targetNode1.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(sourceNode1, addReactFlowPrefix(sourceNode1.key, SchemaType.Source)),
        });

        // Index
        applyConnectionValue(connections, {
          targetNode: indexPseudoFunction,
          targetNodeReactFlowKey: indexFunctionId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        // Child prop
        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(indexPseudoFunction, indexFunctionId),
        });

        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemNode, addReactFlowPrefix(sourceArrayItemNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: directAccessPseudoFunction,
          targetNodeReactFlowKey: directAccessId,
          findInputSlot: true,
          input: createNodeConnection(sourceArrayItemPropNode, addReactFlowPrefix(sourceArrayItemPropNode.key, SchemaType.Source)),
        });

        applyConnectionValue(connections, {
          targetNode: targetArrayItemPropNode,
          targetNodeReactFlowKey: addReactFlowPrefix(targetArrayItemPropNode.key, SchemaType.Target),
          findInputSlot: true,
          input: createNodeConnection(directAccessPseudoFunction, directAccessId),
        });

        generateMapDefinitionBody(mapDefinition, connections);

        expect(Object.keys(mapDefinition).length).toEqual(1);
        const rootObject = mapDefinition['root'] as MapDefinitionEntry;
        const rootKeys = Object.keys(rootObject);
        expect(rootKeys.length).toEqual(2);

        expect(rootObject[targetNode1.name]).toEqual(sourceNode1.key);

        const complexArray1Object = rootObject[targetLoopNode.qName] as MapDefinitionEntry;
        const forLoopObject = complexArray1Object[`$for(${sourceArrayItemNode.key}, $a)`] as MapDefinitionEntry;
        const forLoopObjectKeys = Object.keys(forLoopObject);
        expect(forLoopObjectKeys.length).toEqual(1);

        expect(forLoopObject[targetArrayItemPropNode.name]).toEqual('/root/Nums/*[$a]/Num');
      });
    });
  });
});
