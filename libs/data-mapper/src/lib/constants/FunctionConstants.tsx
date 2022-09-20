import { Collection20Regular, StringCategory20Regular } from '../images/CategoryIcons';
import type { IconProps } from '../images/IconModel';
import { AddSubtractCircle20Filled, CalendarClock20Regular, Cube20Regular, MathSymbols20Regular } from '@fluentui/react-icons';

export interface FunctionGroupBranding {
  displayName: string;
  colorLight: string;
  colorDark: string;
  icon: IconProps;
}

export const collectionBranding: FunctionGroupBranding = {
  displayName: 'Collection',
  colorLight: '#ae8c00',
  colorDark: '#c9a618',
  icon: <Collection20Regular />,
};

export const dateTimeBranding: FunctionGroupBranding = {
  displayName: 'Date and time',
  colorLight: '#4f6bed',
  colorDark: '#93a4f4',
  icon: <CalendarClock20Regular />,
};

export const logicalBranding: FunctionGroupBranding = {
  displayName: 'Logical comparison',
  colorLight: '#038387',
  colorDark: '#4bb4b7',
  icon: <AddSubtractCircle20Filled />,
};

export const mathBranding: FunctionGroupBranding = {
  displayName: 'Math',
  colorLight: '#004e8c',
  colorDark: '#286ea8',
  icon: <MathSymbols20Regular />,
};

export const stringBranding: FunctionGroupBranding = {
  displayName: 'String',
  colorLight: '#e43ba6',
  colorDark: '#ef85cb',
  icon: <Cube20Regular />,
};

export const utilityBranding: FunctionGroupBranding = {
  displayName: 'Utility',
  colorLight: '#8764b8',
  colorDark: '#a083c9',
  icon: <StringCategory20Regular />,
};
