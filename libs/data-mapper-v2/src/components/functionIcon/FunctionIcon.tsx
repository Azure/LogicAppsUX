import type { FunctionCategory } from '../../models';
import { iconForFunction, iconForFunctionCategory } from '../../utils/Icon.Utils';

export interface FunctionIconProps {
  functionKey: string;
  functionName: string;
  categoryName: FunctionCategory;
  color: string;
}

export const FunctionIcon = ({ functionKey, functionName, categoryName, color }: FunctionIconProps) => {
  const FunctionIcon = iconForFunction(functionKey, color);
  const CategoryIcon = iconForFunctionCategory(categoryName);

  return FunctionIcon ? FunctionIcon : <CategoryIcon fontSize="10px" title={functionName} primaryFill={color} />;
};
