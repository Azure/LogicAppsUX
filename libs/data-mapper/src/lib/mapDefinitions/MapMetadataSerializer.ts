import type { FunctionDictionary } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { isFunctionData } from '../utils/Function.Utils';

interface FunctionLocationMetadata {
  targetKey: string;
  xPos: number;
  yPos: number;
}

interface FunctionMetadata {
  reactFlowGuid: string;
  functionKey: string;
  locations: FunctionLocationMetadata[];
  connections: string[];
}

export interface MapMetadata {
  functionNodes: FunctionMetadata[];
}

export const generateMapMetadata = (functionDictionary: FunctionDictionary, connections: ConnectionDictionary): MapMetadata => {
  const functionMetadata: FunctionMetadata[] = [];

  Object.entries(functionDictionary).forEach(([functionKey, functionValue]) => {
    functionMetadata.push({
      reactFlowGuid: functionKey,
      functionKey: functionValue.functionData.key,
      locations: functionValue.functionLocations.map<FunctionLocationMetadata>((location) => ({
        targetKey: location.key,
        xPos: 0,
        yPos: 0,
      })),
      connections: generateFunctionConnectionMetadata(functionKey, connections),
    });
  });

  return {
    functionNodes: functionMetadata,
  };
};

export const generateFunctionConnectionMetadata = (connectionKey: string, connections: ConnectionDictionary): string[] => {
  const connection = connections[connectionKey];

  if (connection) {
    const isFunctionNode = isFunctionData(connection.self.node);

    const results: string[] = [isFunctionNode ? connectionKey : connection.self.node.key];
    connection.outputs.forEach((output) => {
      results.push(generateFunctionConnectionMetadata(output.reactFlowKey, connections).join());
    });

    return results;
  }

  return [];
};
