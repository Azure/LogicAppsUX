import type { FunctionDictionary } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import type { ConnectionAndOrder, FunctionMetadata, MapMetadata } from '../models/MapMetadata';

export const generateMapMetadata = (functionDictionary: FunctionDictionary, connections: ConnectionDictionary): MapMetadata => {
  const functionMetadata: FunctionMetadata[] = [];

  Object.entries(functionDictionary).forEach(([functionKey, functionValue]) => {
    functionMetadata.push({
      reactFlowGuid: functionKey,
      functionKey: functionValue.functionData.key,
      positions: functionValue.functionData.positions || [],
      connections: generateFunctionConnectionMetadata(functionKey, connections),
    });
  });

  return {
    functionNodes: functionMetadata,
  };
};

export const generateFunctionConnectionMetadata = (connectionKey: string, connections: ConnectionDictionary): ConnectionAndOrder[] => {
  const connection = connections[connectionKey];

  if (connection) {
    const results: ConnectionAndOrder[] = [];
    if (connection.outputs[0] === undefined) {
      return results;
    }
    const firstOutputKey = connection.outputs[0].reactFlowKey;
    let index = 0;
    const firstOutputObj = connections[firstOutputKey];
    const outputsInput = firstOutputObj.inputs;
    while (outputsInput[index.toString()]) {
      const input2 = outputsInput[index.toString()][0];
      if (input2 && typeof input2 !== 'string' && input2.reactFlowKey === connectionKey) {
        const connAndOrder: ConnectionAndOrder = {
          name: firstOutputKey,
          inputOrder: index,
        };
        if ('functionName' in firstOutputObj.self.node) {
          connAndOrder.name = firstOutputObj.self.node.functionName;
        }
        results.push(connAndOrder);
        results.push(...generateFunctionConnectionMetadata(firstOutputKey, connections));
        break;
      }
      index++;
    }

    return results;
  }

  return [];
};
