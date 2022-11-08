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
import { findFunctionForFunctionName, findFunctionForKey, getIndexValueForCurrentConnection, isFunctionData } from './Function.Utils';
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

  const currentConnection = connections[addTargetReactFlowPrefix(path[0].key)];
  const loopHasIndex = nodeHasSpecificInputEventually(indexPseudoFunctionKey, currentConnection, connections, false);

  let forEntry: string;
  if (loopHasIndex) {
    const indexFunctionKey = (isConnectionUnit(currentConnection.inputs[0][0]) && currentConnection.inputs[0][0].reactFlowKey) || '';
    const indexFunctionInput = connections[indexFunctionKey];
    forEntry = `${mapNodeParams.for}(${loopValue}, ${getIndexValueForCurrentConnection(indexFunctionInput)})`;
  } else {
    forEntry = `${mapNodeParams.for}(${loopValue})`;
  }

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
    return getIndexValueForCurrentConnection(currentConnection);
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
              return getIndexValueForCurrentConnection(currentConnection);
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

/* Deserialize yml */
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

  const testNested = {
    'target-/ns0:Root/Ano/Mes/Dia': {
      self: {
        node: {
          key: '/ns0:Root/Ano/Mes/Dia',
          name: 'Dia',
          schemaNodeDataType: 'String',
          normalizedDataType: 'String',
          properties: 'NotSpecified',
          fullName: 'Dia',
          parentKey: '/ns0:Root/Ano/Mes',
          nodeProperties: ['NotSpecified'],
          children: [],
          pathToRoot: [
            { key: '/ns0:Root', name: 'Root', fullName: 'ns0:Root', repeating: false },
            { key: '/ns0:Root/Ano', name: 'Ano', fullName: 'Ano', repeating: true },
            { key: '/ns0:Root/Ano/Mes', name: 'Mes', fullName: 'Mes', repeating: true },
            { key: '/ns0:Root/Ano/Mes/Dia', name: 'Dia', fullName: 'Dia', repeating: false },
          ],
        },
        reactFlowKey: 'target-/ns0:Root/Ano/Mes/Dia',
      },
      inputs: {
        '0': [
          {
            node: {
              key: '/ns0:Root/Year/Month/Day',
              name: 'Day',
              schemaNodeDataType: 'String',
              normalizedDataType: 'String',
              properties: 'NotSpecified',
              fullName: 'Day',
              parentKey: '/ns0:Root/Year/Month',
              nodeProperties: ['NotSpecified'],
              children: [],
              pathToRoot: [
                { key: '/ns0:Root', name: 'Root', fullName: 'ns0:Root', repeating: false },
                { key: '/ns0:Root/Year', name: 'Year', fullName: 'Year', repeating: false },
                { key: '/ns0:Root/Year/Month', name: 'Month', fullName: 'Month', repeating: true },
                { key: '/ns0:Root/Year/Month/Day', name: 'Day', fullName: 'Day', repeating: false },
              ],
            },
            reactFlowKey: 'source-/ns0:Root/Year/Month/Day',
          },
        ],
      },
      outputs: [],
    },
    'source-/ns0:Root/Year/Month/Day': {
      self: {
        node: {
          key: '/ns0:Root/Year/Month/Day',
          name: 'Day',
          schemaNodeDataType: 'String',
          normalizedDataType: 'String',
          properties: 'NotSpecified',
          fullName: 'Day',
          parentKey: '/ns0:Root/Year/Month',
          nodeProperties: ['NotSpecified'],
          children: [],
          pathToRoot: [
            { key: '/ns0:Root', name: 'Root', fullName: 'ns0:Root', repeating: false },
            { key: '/ns0:Root/Year', name: 'Year', fullName: 'Year', repeating: false },
            { key: '/ns0:Root/Year/Month', name: 'Month', fullName: 'Month', repeating: true },
            { key: '/ns0:Root/Year/Month/Day', name: 'Day', fullName: 'Day', repeating: false },
          ],
        },
        reactFlowKey: 'source-/ns0:Root/Year/Month/Day',
      },
      inputs: { '0': [] },
      outputs: [
        {
          node: {
            key: '/ns0:Root/Ano/Mes/Dia',
            name: 'Dia',
            schemaNodeDataType: 'String',
            normalizedDataType: 'String',
            properties: 'NotSpecified',
            fullName: 'Dia',
            parentKey: '/ns0:Root/Ano/Mes',
            nodeProperties: ['NotSpecified'],
            children: [],
            pathToRoot: [
              { key: '/ns0:Root', name: 'Root', fullName: 'ns0:Root', repeating: false },
              { key: '/ns0:Root/Ano', name: 'Ano', fullName: 'Ano', repeating: true },
              { key: '/ns0:Root/Ano/Mes', name: 'Mes', fullName: 'Mes', repeating: true },
              { key: '/ns0:Root/Ano/Mes/Dia', name: 'Dia', fullName: 'Dia', repeating: false },
            ],
          },
          reactFlowKey: 'target-/ns0:Root/Ano/Mes/Dia',
        },
      ],
    },
  };

  return testNested as unknown as ConnectionDictionary;
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
    const amendedSourceKey = targetKey.includes(mapNodeParams.for) ? getSourceValueFromLoop(sourceNodeObject, targetKey) : sourceNodeObject;
    const sourceNode =
      sourceEndOfFunction > -1
        ? findFunctionForFunctionName(amendedSourceKey.substring(0, sourceEndOfFunction), functions)
        : findNodeForKey(amendedSourceKey, sourceSchema.schemaTreeRoot);
    const sourceKey =
      sourceNode && isFunctionData(sourceNode)
        ? createdNodes[amendedSourceKey]
          ? createdNodes[amendedSourceKey]
          : createReactFlowFunctionKey(sourceNode)
        : `${sourcePrefix}${amendedSourceKey}`;
    createdNodes[amendedSourceKey] = sourceKey;

    const destinationFunctionKey = targetKey.slice(0, targetKey.indexOf('-'));
    const destinationFunctionGuid = targetKey.slice(targetKey.indexOf('-') + 1);
    const destinationNode = isAGuid(destinationFunctionGuid)
      ? findFunctionForKey(destinationFunctionKey, functions)
      : findNodeForKey(targetKey, targetSchema.schemaTreeRoot);
    const destinationKey = isAGuid(destinationFunctionGuid) ? targetKey : `${targetPrefix}${destinationNode?.key}`;

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

export const getSourceValueFromLoop = (sourceKey: string, targetKey: string): string => {
  // danielle will account for nested loops in next PR
  let constructedSourceKey = '';
  const matchArr = targetKey.match(/\$for\([^)]+\)\//g);
  let match = matchArr?.[matchArr.length - 1];
  match = match?.replace('$for(', '');
  match = match?.replace(')', '');
  const endOfLastFunctionIndex = sourceKey.lastIndexOf('(');
  if (endOfLastFunctionIndex > 0) {
    constructedSourceKey =
      sourceKey.substring(0, sourceKey.lastIndexOf('(') + 1) +
      match +
      sourceKey.substring(sourceKey.lastIndexOf('(') + 1, sourceKey.length + 1);
  } else {
    constructedSourceKey = match + sourceKey;
  }
  return constructedSourceKey;
};

const formatCustomValue = (customValue: string) => customValueQuoteToken + customValue + customValueQuoteToken;
