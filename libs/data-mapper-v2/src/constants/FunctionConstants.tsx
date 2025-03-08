import { CollectionRegular, StringCategory20Regular } from '../images/FunctionIcons/CategoryIcons';
import type { IconProps } from '../images/IconModel';
import {
  AddSubtractCircle20Filled,
  CalendarClock20Regular,
  Wrench20Regular,
  MathSymbols20Regular,
  ArrowSwap20Regular,
} from '@fluentui/react-icons';

export interface FunctionGroupBranding {
  displayName: string;
  colorTokenName: FunctionCategoryColorToken;
  icon: IconProps;
}

export type FunctionCategoryColorToken = 'colorFnCategoryCustom' | 'colorFnCategoryCollection' | 'colorFnCategoryDateTime' | 'colorFnCategoryLogical' | 'colorFnCategoryMath' | 'colorFnCategoryString' | 'colorFnCategoryUtility' | 'colorFnCategoryConversion';

export const UnboundedInput = -1;

export const customBranding: FunctionGroupBranding = {
  displayName: 'Custom',
  colorTokenName: 'colorFnCategoryCustom',
  icon: <Wrench20Regular />,
};

export const collectionBranding: FunctionGroupBranding = {
  displayName: 'Collection',
  colorTokenName: 'colorFnCategoryCollection',
  icon: <CollectionRegular />,
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
  icon: <StringCategory20Regular />,
};

export const utilityBranding: FunctionGroupBranding = {
  displayName: 'Utility',
  colorTokenName: 'colorFnCategoryUtility',
  icon: <Wrench20Regular />,
};

export const conversionBranding: FunctionGroupBranding = {
  displayName: 'Conversion',
  colorTokenName: 'colorFnCategoryConversion',
  icon: <ArrowSwap20Regular />,
};
