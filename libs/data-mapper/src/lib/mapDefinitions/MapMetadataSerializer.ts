import type { FunctionDictionary } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import type { FunctionMetadata, MapMetadata } from '../models/MapMetadata';
import { isFunctionData } from '../utils/Function.Utils';

export const generateMapMetadata = (functionDictionary: FunctionDictionary, connections: ConnectionDictionary): MapMetadata => {
  const functionMetadata: FunctionMetadata[] = [];

  Object.entries(functionDictionary).forEach(([functionKey, functionValue]) => {
    functionMetadata.push({
      reactFlowGuid: functionKey,
      functionKey: functionValue.functionData.key,
      locations: functionValue.functionData.positions || [],
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
