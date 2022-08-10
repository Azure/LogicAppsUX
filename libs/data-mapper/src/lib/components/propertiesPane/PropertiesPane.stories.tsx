import type { PropertiesPaneProps } from './PropertiesPane';
import { PropertiesPane } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: PropertiesPane,
  title: 'Data Mapper/PropertiesPane',
} as ComponentMeta<typeof PropertiesPane>;

export const Standard: ComponentStory<typeof PropertiesPane> = (args: PropertiesPaneProps) => <PropertiesPane {...args} />;
Standard.args = {
  panelItem: undefined,
};
