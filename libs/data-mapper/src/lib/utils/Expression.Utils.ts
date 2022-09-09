import {
  collectionBranding,
  dateTimeBranding,
  logicalBranding,
  mathBranding,
  stringBranding,
  utilityBranding,
} from '../constants/ExpressionConstants';
import { ExpressionCategory } from '../models/Expression';

export const getExpressionBrandingForCategory = (expressionCategory: ExpressionCategory) => {
  switch (expressionCategory) {
    case ExpressionCategory.Collection: {
      return collectionBranding;
    }
    case ExpressionCategory.DateTime: {
      return dateTimeBranding;
    }
    case ExpressionCategory.Logical: {
      return logicalBranding;
    }
    case ExpressionCategory.Math: {
      return mathBranding;
    }
    case ExpressionCategory.String: {
      return stringBranding;
    }
    case ExpressionCategory.Utility: {
      return utilityBranding;
    }
    default: {
      console.error(`Invalid category provided: ${expressionCategory}`);
      return utilityBranding;
    }
  }
};
