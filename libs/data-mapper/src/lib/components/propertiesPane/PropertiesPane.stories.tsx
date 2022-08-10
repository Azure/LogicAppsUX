import { PANEL_ITEM, PropertiesPane } from './PropertiesPane';
import type { PropertiesPaneProps } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: PropertiesPane,
  title: 'Data Mapper/PropertiesPane',
  argTypes: {
    panelItem: {
      options: [undefined, PANEL_ITEM.INPUT_SCHEMA_NODE, PANEL_ITEM.OUTPUT_SCHEMA_NODE, PANEL_ITEM.EXPRESSION],
      control: { type: 'select' },
    },
  },
} as ComponentMeta<typeof PropertiesPane>;

export const Standard: ComponentStory<typeof PropertiesPane> = (args: PropertiesPaneProps) => <PropertiesPane {...args} />;
Standard.args = {
  panelItem: undefined,
};
