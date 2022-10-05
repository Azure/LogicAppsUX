import {
  collectionBranding,
  dateTimeBranding,
  logicalBranding,
  mathBranding,
  stringBranding,
  utilityBranding,
} from '../constants/FunctionConstants';
import type { SchemaNodeExtended } from '../models';
import type { FunctionData } from '../models/Function';
import { FunctionCategory } from '../models/Function';

export const getFunctionBrandingForCategory = (functionCategory: FunctionCategory) => {
  switch (functionCategory) {
    case FunctionCategory.Collection: {
      return collectionBranding;
    }
    case FunctionCategory.DateTime: {
      return dateTimeBranding;
    }
    case FunctionCategory.Logical: {
      return logicalBranding;
    }
    case FunctionCategory.Math: {
      return mathBranding;
    }
    case FunctionCategory.String: {
      return stringBranding;
    }
    case FunctionCategory.Utility: {
      return utilityBranding;
    }
    default: {
      console.error(`Invalid category provided: ${functionCategory}`);
      return utilityBranding;
    }
  }
};

/* XXX
export const findFunctionForKey = (nodeKey: string, schemaNode: SchemaNodeExtended): SchemaNodeExtended | undefined => {
  if (schemaNode.key === nodeKey) {
    return schemaNode;
  }

  let result: SchemaNodeExtended | undefined = undefined;
  schemaNode.children.forEach((childNode) => {
    const tempResult = findNodeForKey(nodeKey, childNode);

    if (tempResult) {
      result = tempResult;
    }
  });

  return result;
}; */

export const isFunctionData = (node: SchemaNodeExtended | FunctionData): node is FunctionData => 'functionName' in node;
