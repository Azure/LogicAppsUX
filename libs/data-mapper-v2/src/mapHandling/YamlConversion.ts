import type { MapDefinitionEntry, MapDefinitionValue } from '@microsoft/logic-apps-shared';
import { isAGuid } from '@microsoft/logic-apps-shared';
import { mapNodeParams, reservedMapDefinitionKeys } from '../constants/MapDefinitionConstants';
import yaml from 'js-yaml';

export const createYamlFromMap = (mapDefinition: MapDefinitionEntry, targetSchemaSortArray: string[]) => {
  // Custom values directly on target nodes need to have extra single quotes stripped out
  const map = yaml
    .dump(mapDefinition, {
      replacer: yamlReplacer,
      noRefs: true,
      noArrayIndent: true,
      sortKeys: (keyA, keyB) => {
        console.log(keyA);
        console.log(keyB);
        return sortMapDefinition(keyA, keyB, targetSchemaSortArray, mapDefinition);
      }, // danielle pass map definition here to sort
    })
    .replaceAll(/'"|"'/g, '"')
    .replaceAll('- ', '  ');
  return map;
};

const yamlReplacer = (key: string, value: MapDefinitionValue) => {
  if (typeof value === 'string' && key === reservedMapDefinitionKeys.version) {
    return Number.parseFloat(value);
  }

  if (Array.isArray(value)) {
    const modifiedArr = value.map((item) => {
      const newItem: MapDefinitionEntry = {};
      const key = Object.keys(item)[0];
      if (key.length > 36 && isAGuid(key.substring(key.length - 36, key.length))) {
        const newKey = key.substring(0, key.length - 37);
        newItem[newKey] = item[key];
        return newItem;
      }
      return item;
    });
    return modifiedArr;
  }

  return value;
};

// this gets the first child of 'if' or 'for' to determine order
// key always starts with 'if' or 'for'
const findKeyInMap = (mapDefinition: MapDefinitionEntry, key: string): string | undefined => {
  if (mapDefinition[key]) {
    return key;
  }

  const keys = Object.keys(mapDefinition);
  for (const currentKey of keys) {
    if (typeof mapDefinition[currentKey] === 'object') {
      const foundKey = findKeyInMap(mapDefinition[currentKey] as MapDefinitionEntry, key);
      if (foundKey) {
        if (mapDefinition[currentKey] && (mapDefinition[currentKey] as MapDefinitionEntry)[foundKey]) {
          const childKey = Object.keys((mapDefinition[currentKey] as MapDefinitionEntry)[foundKey])[0];
          if (!childKey) {
            return foundKey;
          }
          return childKey;
        }
      }
      return foundKey;
    }
  }

  return undefined;
};

const sortMapDefinition = (nameA: any, nameB: any, targetSchemaSortArray: string[], mapDefinition: MapDefinitionEntry): number => {
  let targetForA = nameA;
  if (nameA.startsWith(mapNodeParams.for) || nameA.startsWith(mapNodeParams.if)) {
    // find 'A' in the mapDefintion and find the first child
    targetForA = findKeyInMap(mapDefinition, nameA) ?? '';
  }
  let targetForB = nameB;
  if (nameB.startsWith(mapNodeParams.for) || nameB.startsWith(mapNodeParams.if)) {
    // find 'B' in the mapDefintion and find the first child
    targetForB = findKeyInMap(mapDefinition, nameB) ?? '';
  }

  const potentialKeyObjectsA = targetSchemaSortArray.findIndex((node, _index) => {
    if (node.endsWith(targetForA)) {
      const trimmedNode = node.substring(0, node.indexOf(targetForA) - 1);
      return trimmedNode;
    }
    return false;
  });

  // this does not work 100%, we need full path in next iteration

  const potentialKeyObjectsB = targetSchemaSortArray.findIndex((node, _index) => {
    if (node.endsWith(targetForB)) {
      const trimmedNode = node.substring(0, node.indexOf(targetForB) - 1);
      return trimmedNode;
    }
    return false;
  });

  return potentialKeyObjectsA - potentialKeyObjectsB;
};
