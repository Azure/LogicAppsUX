import { store } from '../../core/state/Store';
import type { TargetSchemaPaneProps } from './TargetSchemaPane';
import { TargetSchemaPane } from './TargetSchemaPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: TargetSchemaPane,
  title: 'Data Mapper Components/Pane/Target Schema Pane',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof TargetSchemaPane>;

export const Standard: ComponentStory<typeof TargetSchemaPane> = (args: TargetSchemaPaneProps) => <TargetSchemaPane {...args} />;

Standard.args = {
  isExpanded: true,
  setIsExpanded: (isExpanded: boolean) => console.log('Setting expanded to: ', isExpanded),
};
