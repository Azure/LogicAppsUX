import type { PropertiesPaneProps } from './PropertiesPane';
import { PropertiesPane } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: PropertiesPane,
  title: 'Data Mapper Component/Pane/Properties Pane',
} as ComponentMeta<typeof PropertiesPane>;

export const Standard: ComponentStory<typeof PropertiesPane> = (args: PropertiesPaneProps) => (
  <PropertiesPane
    {...args}
    setIsExpanded={() => {
      return;
    }}
    setContentHeight={() => {
      return;
    }}
  />
);
Standard.args = {
  currentNode: undefined,
};
