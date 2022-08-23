import { PANE_ITEM, PropertiesPane } from './PropertiesPane';
import type { PropertiesPaneProps } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: PropertiesPane,
  title: 'Data Mapper/PropertiesPane',
  argTypes: {
    paneItem: {
      options: [undefined, PANE_ITEM.INPUT_SCHEMA_NODE, PANE_ITEM.OUTPUT_SCHEMA_NODE, PANE_ITEM.EXPRESSION],
      control: { type: 'select' },
    },
  },
} as ComponentMeta<typeof PropertiesPane>;

export const Standard: ComponentStory<typeof PropertiesPane> = (args: PropertiesPaneProps) => <PropertiesPane {...args} />;
Standard.args = {
  paneItem: undefined,
};
