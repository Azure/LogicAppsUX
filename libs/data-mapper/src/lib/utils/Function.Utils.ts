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

export const findFunctionForFunctionName = (nodeKey: string, functions: FunctionData[]): FunctionData | undefined =>
  functions.find((functionData) => functionData.functionName === nodeKey);

export const findFunctionForKey = (nodeKey: string, functions: FunctionData[]): FunctionData | undefined =>
  functions.find((functionData) => functionData.key === nodeKey);

export const isFunctionData = (node: SchemaNodeExtended | FunctionData): node is FunctionData => 'functionName' in node;
