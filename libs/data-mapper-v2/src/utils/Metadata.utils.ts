import type { FunctionMetadata, MapMetadataV2 } from '@microsoft/logic-apps-shared';
import type { ConnectionDictionary } from '../models/Connection';
import type { FunctionDictionary } from '../models/Function';
import { convertConnectionShorthandToId, generateFunctionConnectionMetadata } from '../mapHandling/MapMetadataSerializer';

export const doesFunctionMetadataExist = (metadata: MapMetadataV2 | undefined) => {
  return metadata?.functionNodes && metadata.functionNodes.length > 0;
};

export const assignFunctionNodePositionsFromMetadata = (
  connections: ConnectionDictionary,
  metadata: FunctionMetadata[],
  functions: FunctionDictionary
) => {
  Object.keys(functions).forEach((key) => {
    // find matching metadata
    const generatedMetadata = generateFunctionConnectionMetadata(key, connections);
    const id = convertConnectionShorthandToId(generatedMetadata);
    const matchingMetadata = metadata.find((meta) => meta.connectionShorthand === id);

    // assign position data to function in store
    functions[key] = {
      ...functions[key],
      position: matchingMetadata?.position,
    };
  });
  return functions;
};
