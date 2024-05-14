import type { FunctionCategory } from '../../models';
import { iconForFunction, iconForFunctionCategory } from '../../utils/Icon.Utils';

export interface FunctionIconProps {
  functionKey: string;
  functionName: string;
  categoryName: FunctionCategory;
  color: string;
  iconSize: number;
}

export const FunctionIcon = ({ functionKey, functionName, categoryName, color, iconSize }: FunctionIconProps) => {
  const FunctionIcon = iconForFunction(functionKey, color, iconSize);
  const CategoryIcon = iconForFunctionCategory(categoryName);

  return FunctionIcon ? (
    FunctionIcon
  ) : (
    <CategoryIcon style={{ height: iconSize, width: iconSize }} fontSize={`${iconSize}px`} title={functionName} primaryFill={color} />
  );
};
