import type { TargetSchemaPaneProps } from './TargetSchemaPane';
import { TargetSchemaPane } from './TargetSchemaPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: TargetSchemaPane,
  title: 'Data Mapper Component/Pane/Target Schema Pane',
} as ComponentMeta<typeof TargetSchemaPane>;

export const Standard: ComponentStory<typeof TargetSchemaPane> = (args: TargetSchemaPaneProps) => <TargetSchemaPane {...args} />;

Standard.args = {
  isExpanded: true,
  setIsExpanded: (_isExpanded: boolean) => {
    return;
  },
};
