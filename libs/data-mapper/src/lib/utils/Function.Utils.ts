import {
  collectionBranding,
  dateTimeBranding,
  logicalBranding,
  mathBranding,
  stringBranding,
  utilityBranding,
} from '../constants/FunctionConstants';
import type { SchemaNodeExtended } from '../models';
import type { FunctionCategory, FunctionData } from '../models/Function';

export const getFunctionBrandingForCategory = (functionCategory: FunctionCategory) => {
  switch (functionCategory) {
    case 'collection': {
      return collectionBranding;
    }
    case 'dateTime': {
      return dateTimeBranding;
    }
    case 'logical': {
      return logicalBranding;
    }
    case 'math': {
      return mathBranding;
    }
    case 'string': {
      return stringBranding;
    }
    case 'utility': {
      return utilityBranding;
    }
    default: {
      console.error(`Invalid category provided: ${functionCategory}`);
      return utilityBranding;
    }
  }
};

export const isFunctionData = (node: SchemaNodeExtended | FunctionData): node is FunctionData => 'functionName' in node;
