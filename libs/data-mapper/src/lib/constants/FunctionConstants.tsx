import { Collection20Regular, StringCategory20Regular } from '../images/CategoryIcons';
import type { IconProps } from '../images/IconModel';
import { AddSubtractCircle20Filled, CalendarClock20Regular, Cube20Regular, MathSymbols20Regular } from '@fluentui/react-icons';

export interface FunctionGroupBranding {
  displayName: string;
  colorTokenName: string;
  icon: IconProps;
}

export const collectionBranding: FunctionGroupBranding = {
  displayName: 'Collection',
  colorTokenName: 'colorFnCategoryCollection',
  icon: <Collection20Regular />,
};

export const dateTimeBranding: FunctionGroupBranding = {
  displayName: 'Date and time',
  colorTokenName: 'colorFnCategoryDateTime',
  icon: <CalendarClock20Regular />,
};

export const logicalBranding: FunctionGroupBranding = {
  displayName: 'Logical comparison',
  colorTokenName: 'colorFnCategoryLogical',
  icon: <AddSubtractCircle20Filled />,
};

export const mathBranding: FunctionGroupBranding = {
  displayName: 'Math',
  colorTokenName: 'colorFnCategoryMath',
  icon: <MathSymbols20Regular />,
};

export const stringBranding: FunctionGroupBranding = {
  displayName: 'String',
  colorTokenName: 'colorFnCategoryString',
  icon: <Cube20Regular />,
};

export const utilityBranding: FunctionGroupBranding = {
  displayName: 'Utility',
  colorTokenName: 'colorFnCategoryUtility',
  icon: <StringCategory20Regular />,
};
