/* eslint-disable no-param-reassign */
import {
  customValueQuoteToken,
  mapDefinitionVersion,
  mapNodeParams,
  reservedMapDefinitionKeys,
  reservedMapDefinitionKeysArray,
} from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData } from '../models/Function';
import { ifPseudoFunctionKey, indexPseudoFunctionKey } from '../models/Function';
import type { MapDefinitionEntry } from '../models/MapDefinition';
import type { PathItem, SchemaExtended, SchemaNodeExtended } from '../models/Schema';
import { SchemaNodeProperty } from '../models/Schema';
import {
  addNodeToConnections,
  flattenInputs,
  isConnectionUnit,
  isCustomValue,
  nodeHasSourceNodeEventually,
  nodeHasSpecificInputEventually,
} from './Connection.Utils';
import { findFunctionForFunctionName, findFunctionForKey, isFunctionData } from './Function.Utils';
import { addTargetReactFlowPrefix, createReactFlowFunctionKey } from './ReactFlow.Util';
import { findNodeForKey, isSchemaNodeExtended } from './Schema.Utils';
import { isAGuid } from '@microsoft-logic-apps/utils';
import yaml from 'js-yaml';

export const convertToMapDefinition = (
  connections: ConnectionDictionary,
  sourceSchema: SchemaExtended | undefined,
  targetSchema: SchemaExtended | undefined
): string => {
  if (sourceSchema && targetSchema && isValidToMakeMapDefinition(connections)) {
    const mapDefinition: MapDefinitionEntry = {};

    generateMapDefinitionHeader(mapDefinition, sourceSchema, targetSchema);
    generateMapDefinitionBody(mapDefinition, connections);

    return yaml.dump(mapDefinition, { quotingType: `"`, replacer: yamlReplacer }).replaceAll(customValueQuoteToken, '"');
  }

  return '';
};

// Exported for testing purposes
export const generateMapDefinitionHeader = (
  mapDefinition: MapDefinitionEntry,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended
): void => {
  mapDefinition[reservedMapDefinitionKeys.version] = mapDefinitionVersion;
  mapDefinition[reservedMapDefinitionKeys.sourceFormat] = sourceSchema.type;
  mapDefinition[reservedMapDefinitionKeys.targetFormat] = targetSchema.type;
  mapDefinition[reservedMapDefinitionKeys.sourceSchemaName] = sourceSchema.name;
  mapDefinition[reservedMapDefinitionKeys.targetSchemaName] = targetSchema.name;

  if (sourceSchema.namespaces && Object.keys(sourceSchema.namespaces).length > 0) {
    mapDefinition[reservedMapDefinitionKeys.sourceNamespaces] = sourceSchema.namespaces;
  }

  if (targetSchema.namespaces && Object.keys(targetSchema.namespaces).length > 0) {
    mapDefinition[reservedMapDefinitionKeys.targetNamespaces] = targetSchema.namespaces;
  }
};

// Exported for testing purposes
export const generateMapDefinitionBody = (mapDefinition: MapDefinitionEntry, connections: ConnectionDictionary): void => {
  // Filter to just the target node connections, all the rest will be picked up be traversing up the chain
  const targetSchemas = Object.entries(connections).filter(([key, _connection]) => key.startsWith(targetPrefix));
  targetSchemas.forEach(([_key, connection]) => {
    const flattenedInputs = flattenInputs(connection.inputs);
    flattenedInputs.forEach((input) => {
      const selfNode = connection.self.node;
      if (input && isSchemaNodeExtended(selfNode)) {
        if (isCustomValue(input)) {
          applyValueAtPath(formatCustomValue(input), mapDefinition, selfNode, selfNode.pathToRoot, connections);
        } else if (isSchemaNodeExtended(input.node)) {
          applyValueAtPath(input.node.key, mapDefinition, selfNode, selfNode.pathToRoot, connections);
        } else {
          if (input.node.key.startsWith(ifPseudoFunctionKey)) {
            const values = collectConditionalValues(connections[input.reactFlowKey], connections);
            const modifiedPathItems = selfNode.pathToRoot.slice(0, -1);
            modifiedPathItems.push({ key: ifPseudoFunctionKey, name: values[1], fullName: values[0], repeating: false });
            modifiedPathItems.push(...selfNode.pathToRoot.slice(-1));
            applyValueAtPath(values[1], mapDefinition, selfNode, modifiedPathItems, connections);
          } else {
            const value = collectFunctionValue(input.node, connections[input.reactFlowKey], connections);
            applyValueAtPath(value, mapDefinition, selfNode, selfNode.pathToRoot, connections);
          }
        }
      }
    });
  });
};

const applyValueAtPath = (
  value: string,
  mapDefinition: MapDefinitionEntry,
  destinationNode: SchemaNodeExtended,
  path: PathItem[],
  connections: ConnectionDictionary
) => {
  const pathLocation = path[0].fullName;
  const formattedPathLocation = pathLocation.startsWith('@') ? `$${pathLocation}` : pathLocation;

  if (path.length > 1) {
    if (path[0].key === ifPseudoFunctionKey) {
      generateIfSection(path[0].fullName, value, mapDefinition, destinationNode, path, connections);
    } else if (path[0].repeating) {
      // Assumption for now that there is only 1 source node in a loop chain
      const parentTargetConnection = connections[addTargetReactFlowPrefix(path[0].key)];
      const parentSourceNode = parentTargetConnection.inputs[0][0];
      let loopValue = '';
      if (parentSourceNode && isConnectionUnit(parentSourceNode)) {
        if (isFunctionData(parentSourceNode.node)) {
          const sourceSchemaNodeConnection = connections[parentSourceNode.reactFlowKey].inputs[0][0];
          const sourceSchemaNodeKey = (isConnectionUnit(sourceSchemaNodeConnection) && sourceSchemaNodeConnection.node.key) || '';
          loopValue = sourceSchemaNodeKey;
        } else {
          loopValue = parentSourceNode.node.key;
        }
      }

      generateForSection(loopValue, value, mapDefinition, destinationNode, path, connections);
    } else {
      if (!mapDefinition[formattedPathLocation]) {
        mapDefinition[formattedPathLocation] = {};
      }

      if (typeof mapDefinition[formattedPathLocation] !== 'string') {
        applyValueAtPath(value, mapDefinition[formattedPathLocation] as MapDefinitionEntry, destinationNode, path.slice(1), connections);
      }
    }
  } else {
    if (destinationNode.nodeProperties.indexOf(SchemaNodeProperty.ComplexTypeSimpleContent) > -1) {
      if (!mapDefinition[formattedPathLocation]) {
        mapDefinition[formattedPathLocation] = {
          [mapNodeParams.value]: value,
        };
      } else {
        (mapDefinition[formattedPathLocation] as MapDefinitionEntry)[mapNodeParams.value] = value;
      }
    } else if (destinationNode.nodeProperties.indexOf(SchemaNodeProperty.Repeating) < 0) {
      mapDefinition[formattedPathLocation] = value;
    }
  }
};

const generateForSection = (
  loopValue: string,
  value: string,
  mapDefinition: MapDefinitionEntry,
  destinationNode: SchemaNodeExtended,
  path: PathItem[],
  connections: ConnectionDictionary
) => {
  const pathLocation = path[0].fullName;
  // Local loop variables use current working directory './' instead of '$'
  const formattedPathLocation = pathLocation.startsWith('@') ? `./${pathLocation}` : pathLocation;

  // TODO allow for nested loops
  const forEntry = nodeHasSpecificInputEventually(
    indexPseudoFunctionKey,
    connections[addTargetReactFlowPrefix(path[0].key)],
    connections,
    false
  )
    ? `${mapNodeParams.for}(${loopValue}, $i)`
    : `${mapNodeParams.for}(${loopValue})`;
  if (!mapDefinition[forEntry]) {
    mapDefinition[forEntry] = {};
  }

  // Step into the loop
  mapDefinition = mapDefinition[forEntry] as MapDefinitionEntry;

  if (!mapDefinition[formattedPathLocation]) {
    mapDefinition[formattedPathLocation] = {};
  }

  let loopLocalValue = value.replaceAll(`${loopValue}/`, '');
  if (loopLocalValue.startsWith('@')) {
    loopLocalValue = `./${loopLocalValue}`;
  }

  applyValueAtPath(loopLocalValue, mapDefinition[formattedPathLocation] as MapDefinitionEntry, destinationNode, path.slice(1), connections);
};

const generateIfSection = (
  conditionalValue: string,
  value: string,
  mapDefinition: MapDefinitionEntry,
  destinationNode: SchemaNodeExtended,
  path: PathItem[],
  connections: ConnectionDictionary
) => {
  const ifEntry = `${mapNodeParams.if}(${conditionalValue})`;
  if (!mapDefinition[ifEntry]) {
    mapDefinition[ifEntry] = {};
  }

  applyValueAtPath(value, mapDefinition[ifEntry] as MapDefinitionEntry, destinationNode, path.slice(1), connections);
};

const collectFunctionValue = (node: FunctionData, currentConnection: Connection, connections: ConnectionDictionary): string => {
  // Special case where the index is used directly
  if (currentConnection.self.node.key === indexPseudoFunctionKey) {
    return '$i';
  }

  const inputValues = getInputValues(currentConnection, connections);

  // Special case for conditionals
  if (currentConnection.self.node.key === ifPseudoFunctionKey) {
    return inputValues[0];
  }

  return combineFunctionAndInputs(node, inputValues);
};

const collectConditionalValues = (currentConnection: Connection, connections: ConnectionDictionary): [string, string] => {
  const inputValues = getInputValues(currentConnection, connections);

  return [inputValues[0], inputValues[1]];
};

const getInputValues = (currentConnection: Connection | undefined, connections: ConnectionDictionary): string[] => {
  return currentConnection
    ? (flattenInputs(currentConnection.inputs)
        .flatMap((input) => {
          if (!input) {
            return undefined;
          }

          if (isCustomValue(input)) {
            return formatCustomValue(input);
          } else if (isSchemaNodeExtended(input.node)) {
            return input.node.fullName.startsWith('@') ? `$${input.node.key}` : input.node.key;
          } else {
            if (input.node.key === indexPseudoFunctionKey) {
              return '$i';
            } else {
              return collectFunctionValue(input.node, connections[input.reactFlowKey], connections);
            }
          }
        })
        .filter((mappedInput) => !!mappedInput) as string[])
    : [];
};

const combineFunctionAndInputs = (functionData: FunctionData, inputs: string[]): string => {
  return `${functionData.functionName}(${inputs.join(', ')})`;
};

export const isValidToMakeMapDefinition = (connections: ConnectionDictionary): boolean => {
  // All functions connections must eventually terminate into the source
  const connectionsArray = Object.entries(connections);
  const allNodesTerminateIntoSource = connectionsArray
    .filter(([key, _connection]) => key.startsWith(targetPrefix))
    .every(([_key, targetConnection]) => nodeHasSourceNodeEventually(targetConnection, connections));

  const allRequiredInputsFilledOut = connectionsArray.every(([_key, targetConnection]) => {
    const selfNode = targetConnection.self.node;
    if (isFunctionData(selfNode)) {
      return selfNode.inputs.every((nodeInput, index) => {
        return nodeInput.isOptional || targetConnection.inputs[index].length > 0;
      });
    }

    return true;
  });

  // Is valid to generate the map definition
  return allNodesTerminateIntoSource && allRequiredInputsFilledOut;
};

/* Deserialize yml */ // danielle maybe separate from serialization
export const convertFromMapDefinition = (
  mapDefinition: MapDefinitionEntry,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended,
  functions: FunctionData[]
): ConnectionDictionary => {
  const connections: ConnectionDictionary = {};
  const parsedYamlKeys: string[] = Object.keys(mapDefinition);

  const rootNodeKey = parsedYamlKeys.filter((key) => reservedMapDefinitionKeysArray.indexOf(key) < 0)[0];

  if (rootNodeKey) {
    parseDefinitionToConnection(mapDefinition[rootNodeKey], `/${rootNodeKey}`, connections, {}, sourceSchema, targetSchema, functions);
  }

  const test = {
    'target-/ns0:Root/DirectTranslation/Employee/Name': {
      self: {
        node: {
          key: '/ns0:Root/DirectTranslation/Employee/Name',
          name: 'Name',
          schemaNodeDataType: 'String',
          normalizedDataType: 'String',
          properties: 'NotSpecified',
          fullName: 'Name',
          parentKey: '/ns0:Root/DirectTranslation/Employee',
          nodeProperties: ['NotSpecified'],
          children: [],
          pathToRoot: [
            { key: '/ns0:Root', name: 'Root', fullName: 'ns0:Root', repeating: false },
            { key: '/ns0:Root/DirectTranslation', name: 'DirectTranslation', fullName: 'DirectTranslation', repeating: false },
            { key: '/ns0:Root/DirectTranslation/Employee', name: 'Employee', fullName: 'Employee', repeating: false },
            { key: '/ns0:Root/DirectTranslation/Employee/Name', name: 'Name', fullName: 'Name', repeating: false },
          ],
        },
        reactFlowKey: 'target-/ns0:Root/DirectTranslation/Employee/Name',
      },
      inputs: {
        '0': [
          {
            node: {
              category: 'Logical',
              description: 'Evaluates the condition of the input value.',
              key: 'Condition',
              maxNumberOfInputs: 1,
              outputValueType: 'Any',
              type: 'TransformationControlFunction',
              displayName: 'Condition',
              functionName: '$if',
              iconFileName: 'dm_category_logical.svg',
              inputs: [
                {
                  allowCustomInput: true,
                  allowedTypes: ['Bool'],
                  isOptional: false,
                  name: 'Condition',
                  placeHolder: 'The condition to evaluate.',
                },
              ],
            },
            reactFlowKey: 'Condition-C0EFBEFC-6411-474F-BA59-7E86982EF286',
          },
        ],
      },
      outputs: [],
    },
    'Condition-C0EFBEFC-6411-474F-BA59-7E86982EF286': {
      self: {
        node: {
          category: 'Logical',
          description: 'Evaluates the condition of the input value.',
          key: 'Condition',
          maxNumberOfInputs: 1,
          outputValueType: 'Any',
          type: 'TransformationControlFunction',
          displayName: 'Condition',
          functionName: '$if',
          iconFileName: 'dm_category_logical.svg',
          inputs: [
            {
              allowCustomInput: true,
              allowedTypes: ['Bool'],
              isOptional: false,
              name: 'Condition',
              placeHolder: 'The condition to evaluate.',
            },
          ],
        },
        reactFlowKey: 'Condition-C0EFBEFC-6411-474F-BA59-7E86982EF286',
      },
      inputs: {
        '0': [
          {
            node: {
              key: 'IsGreater',
              maxNumberOfInputs: 2,
              type: 'TransformationFunction',
              functionName: 'is-greater-than',
              outputValueType: 'Bool',
              inputs: [
                { name: 'Value', allowedTypes: ['Any'], isOptional: false, allowCustomInput: true, placeHolder: 'The value to check.' },
                { name: '', allowedTypes: ['Any'], isOptional: false, allowCustomInput: true, placeHolder: '' },
              ],
              displayName: 'Greater',
              category: 'Logical',
              description: 'Checks whether the first value is greater than the second value.',
            },
            reactFlowKey: 'IsGreater-5E509445-E280-492F-BE9F-73F964A99339',
          },
        ],
      },
      outputs: [
        {
          node: {
            key: '/ns0:Root/DirectTranslation/Employee/Name',
            name: 'Name',
            schemaNodeDataType: 'String',
            normalizedDataType: 'String',
            properties: 'NotSpecified',
            fullName: 'Name',
            parentKey: '/ns0:Root/DirectTranslation/Employee',
            nodeProperties: ['NotSpecified'],
            children: [],
            pathToRoot: [
              { key: '/ns0:Root', name: 'Root', fullName: 'ns0:Root', repeating: false },
              { key: '/ns0:Root/DirectTranslation', name: 'DirectTranslation', fullName: 'DirectTranslation', repeating: false },
              { key: '/ns0:Root/DirectTranslation/Employee', name: 'Employee', fullName: 'Employee', repeating: false },
              { key: '/ns0:Root/DirectTranslation/Employee/Name', name: 'Name', fullName: 'Name', repeating: false },
            ],
          },
          reactFlowKey: 'target-/ns0:Root/DirectTranslation/Employee/Name',
        },
      ],
    },
    'IsGreater-5E509445-E280-492F-BE9F-73F964A99339': {
      self: {
        node: {
          key: 'IsGreater',
          maxNumberOfInputs: 2,
          type: 'TransformationFunction',
          functionName: 'is-greater-than',
          outputValueType: 'Bool',
          inputs: [
            { name: 'Value', allowedTypes: ['Any'], isOptional: false, allowCustomInput: true, placeHolder: 'The value to check.' },
            { name: '', allowedTypes: ['Any'], isOptional: false, allowCustomInput: true, placeHolder: '' },
          ],
          displayName: 'Greater',
          category: 'Logical',
          description: 'Checks whether the first value is greater than the second value.',
        },
        reactFlowKey: 'IsGreater-5E509445-E280-492F-BE9F-73F964A99339',
      },
      inputs: {
        '0': [
          {
            node: {
              key: '/ns0:Root/ConditionalMapping/ItemPrice',
              name: 'ItemPrice',
              schemaNodeDataType: 'Decimal',
              normalizedDataType: 'Decimal',
              properties: 'NotSpecified',
              fullName: 'ItemPrice',
              parentKey: '/ns0:Root/ConditionalMapping',
              nodeProperties: ['NotSpecified'],
              children: [],
              pathToRoot: [
                { key: '/ns0:Root', name: 'Root', fullName: 'ns0:Root', repeating: false },
                { key: '/ns0:Root/ConditionalMapping', name: 'ConditionalMapping', fullName: 'ConditionalMapping', repeating: false },
                { key: '/ns0:Root/ConditionalMapping/ItemPrice', name: 'ItemPrice', fullName: 'ItemPrice', repeating: false },
              ],
            },
            reactFlowKey: 'source-/ns0:Root/ConditionalMapping/ItemPrice',
          },
        ],
        '1': [
          {
            node: {
              key: '/ns0:Root/ConditionalMapping/ItemQuantity',
              name: 'ItemQuantity',
              schemaNodeDataType: 'Decimal',
              normalizedDataType: 'Decimal',
              properties: 'NotSpecified',
              fullName: 'ItemQuantity',
              parentKey: '/ns0:Root/ConditionalMapping',
              nodeProperties: ['NotSpecified'],
              children: [],
              pathToRoot: [
                { key: '/ns0:Root', name: 'Root', fullName: 'ns0:Root', repeating: false },
                { key: '/ns0:Root/ConditionalMapping', name: 'ConditionalMapping', fullName: 'ConditionalMapping', repeating: false },
                { key: '/ns0:Root/ConditionalMapping/ItemQuantity', name: 'ItemQuantity', fullName: 'ItemQuantity', repeating: false },
              ],
            },
            reactFlowKey: 'source-/ns0:Root/ConditionalMapping/ItemQuantity',
          },
        ],
      },
      outputs: [
        {
          node: {
            category: 'Logical',
            description: 'Evaluates the condition of the input value.',
            key: 'Condition',
            maxNumberOfInputs: 1,
            outputValueType: 'Any',
            type: 'TransformationControlFunction',
            displayName: 'Condition',
            functionName: '$if',
            iconFileName: 'dm_category_logical.svg',
            inputs: [
              {
                allowCustomInput: true,
                allowedTypes: ['Bool'],
                isOptional: false,
                name: 'Condition',
                placeHolder: 'The condition to evaluate.',
              },
            ],
          },
          reactFlowKey: 'Condition-C0EFBEFC-6411-474F-BA59-7E86982EF286',
        },
      ],
    },
    'source-/ns0:Root/ConditionalMapping/ItemPrice': {
      self: {
        node: {
          key: '/ns0:Root/ConditionalMapping/ItemPrice',
          name: 'ItemPrice',
          schemaNodeDataType: 'Decimal',
          normalizedDataType: 'Decimal',
          properties: 'NotSpecified',
          fullName: 'ItemPrice',
          parentKey: '/ns0:Root/ConditionalMapping',
          nodeProperties: ['NotSpecified'],
          children: [],
          pathToRoot: [
            { key: '/ns0:Root', name: 'Root', fullName: 'ns0:Root', repeating: false },
            { key: '/ns0:Root/ConditionalMapping', name: 'ConditionalMapping', fullName: 'ConditionalMapping', repeating: false },
            { key: '/ns0:Root/ConditionalMapping/ItemPrice', name: 'ItemPrice', fullName: 'ItemPrice', repeating: false },
          ],
        },
        reactFlowKey: 'source-/ns0:Root/ConditionalMapping/ItemPrice',
      },
      inputs: { '0': [] },
      outputs: [
        {
          node: {
            key: 'IsGreater',
            maxNumberOfInputs: 2,
            type: 'TransformationFunction',
            functionName: 'is-greater-than',
            outputValueType: 'Bool',
            inputs: [
              { name: 'Value', allowedTypes: ['Any'], isOptional: false, allowCustomInput: true, placeHolder: 'The value to check.' },
              { name: '', allowedTypes: ['Any'], isOptional: false, allowCustomInput: true, placeHolder: '' },
            ],
            displayName: 'Greater',
            category: 'Logical',
            description: 'Checks whether the first value is greater than the second value.',
          },
          reactFlowKey: 'IsGreater-5E509445-E280-492F-BE9F-73F964A99339',
        },
      ],
    },
    'source-/ns0:Root/ConditionalMapping/ItemQuantity': {
      self: {
        node: {
          key: '/ns0:Root/ConditionalMapping/ItemQuantity',
          name: 'ItemQuantity',
          schemaNodeDataType: 'Decimal',
          normalizedDataType: 'Decimal',
          properties: 'NotSpecified',
          fullName: 'ItemQuantity',
          parentKey: '/ns0:Root/ConditionalMapping',
          nodeProperties: ['NotSpecified'],
          children: [],
          pathToRoot: [
            { key: '/ns0:Root', name: 'Root', fullName: 'ns0:Root', repeating: false },
            { key: '/ns0:Root/ConditionalMapping', name: 'ConditionalMapping', fullName: 'ConditionalMapping', repeating: false },
            { key: '/ns0:Root/ConditionalMapping/ItemQuantity', name: 'ItemQuantity', fullName: 'ItemQuantity', repeating: false },
          ],
        },
        reactFlowKey: 'source-/ns0:Root/ConditionalMapping/ItemQuantity',
      },
      inputs: { '0': [] },
      outputs: [
        {
          node: {
            key: 'IsGreater',
            maxNumberOfInputs: 2,
            type: 'TransformationFunction',
            functionName: 'is-greater-than',
            outputValueType: 'Bool',
            inputs: [
              { name: 'Value', allowedTypes: ['Any'], isOptional: false, allowCustomInput: true, placeHolder: 'The value to check.' },
              { name: '', allowedTypes: ['Any'], isOptional: false, allowCustomInput: true, placeHolder: '' },
            ],
            displayName: 'Greater',
            category: 'Logical',
            description: 'Checks whether the first value is greater than the second value.',
          },
          reactFlowKey: 'IsGreater-5E509445-E280-492F-BE9F-73F964A99339',
        },
      ],
    },
  };
  console.log(test);

  return connections; //test as unknown as ConnectionDictionary;
};

const parseDefinitionToConnection = (
  sourceNodeObject: string | object | any,
  targetKey: string,
  connections: ConnectionDictionary,
  createdNodes: { [completeFunction: string]: string },
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended,
  functions: FunctionData[]
) => {
  if (typeof sourceNodeObject === 'string') {
    const sourceEndOfFunction = sourceNodeObject.indexOf('(');
    const sourceNode =
      sourceEndOfFunction > -1
        ? findFunctionForFunctionName(sourceNodeObject.substring(0, sourceEndOfFunction), functions)
        : findNodeForKey(sourceNodeObject, sourceSchema.schemaTreeRoot);
    const sourceKey =
      sourceNode && isFunctionData(sourceNode)
        ? createdNodes[sourceNodeObject]
          ? createdNodes[sourceNodeObject]
          : createReactFlowFunctionKey(sourceNode)
        : `${sourcePrefix}${sourceNodeObject}`;
    createdNodes[sourceNodeObject] = sourceKey;

    const destinationFunctionKey = targetKey.slice(0, targetKey.indexOf('-'));
    const destinationFunctionGuid = targetKey.slice(targetKey.indexOf('-') + 1);
    const destinationNode = isAGuid(destinationFunctionGuid)
      ? findFunctionForKey(destinationFunctionKey, functions)
      : findNodeForKey(targetKey, targetSchema.schemaTreeRoot);
    const destinationKey = isAGuid(destinationFunctionGuid) ? targetKey : `${targetPrefix}${targetKey}`;

    if (sourceNode && destinationNode) {
      addNodeToConnections(connections, sourceNode, sourceKey, destinationNode, destinationKey);
    }

    // Need to extract and create connections for nested functions
    if (sourceEndOfFunction > -1) {
      const childFunctions = splitKeyIntoChildren(sourceNodeObject);

      childFunctions.forEach((childFunction) => {
        parseDefinitionToConnection(childFunction, sourceKey, connections, createdNodes, sourceSchema, targetSchema, functions);
      });
    }

    return;
  }

  for (const childKey in sourceNodeObject) {
    if (childKey !== mapNodeParams.value) {
      parseDefinitionToConnection(
        sourceNodeObject[childKey],
        `${targetKey}/${childKey}`,
        connections,
        createdNodes,
        sourceSchema,
        targetSchema,
        functions
      );
    }
  }
};

// Exported for testing purposes only
export const splitKeyIntoChildren = (sourceKey: string): string[] => {
  const functionParams = sourceKey.substring(sourceKey.indexOf('(') + 1, sourceKey.lastIndexOf(')'));

  let openParenthesis = 0;
  let isCustom = false;
  let currentWord = '';
  const results: string[] = [];
  for (let index = 0; index < functionParams.length; index++) {
    const element = functionParams[index];
    if (!isCustom) {
      if (element === '(') {
        openParenthesis++;
        currentWord += element;
      } else if (element === ')') {
        openParenthesis--;
        currentWord += element;
      } else if (element === ',' && openParenthesis === 0) {
        results.push(currentWord.trim());
        currentWord = '';
      } else if (element === '"') {
        isCustom = true;
        currentWord += element;
      } else {
        currentWord += element;
      }
    } else {
      if (element === '"') {
        currentWord += element;
        if (functionParams[index + 1] && functionParams[index + 1] === ',') {
          results.push(currentWord.trim());
          currentWord = '';

          // Skip the next comma
          index++;
        }

        isCustom = false;
      } else {
        currentWord += element;
      }
    }
  }

  if (currentWord) {
    results.push(currentWord.trim());
  }

  return results;
};

const yamlReplacer = (key: string, value: any) => {
  if (typeof value === 'string') {
    if (key === reservedMapDefinitionKeys.version) {
      return parseFloat(value);
    }
  }

  return value;
};

const formatCustomValue = (customValue: string) => customValueQuoteToken + customValue + customValueQuoteToken;
