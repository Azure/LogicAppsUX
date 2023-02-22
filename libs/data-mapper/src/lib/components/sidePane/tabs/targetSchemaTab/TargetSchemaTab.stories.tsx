import { store } from '../../../../core/state/Store';
import { TargetSchemaTab } from './TargetSchemaTab';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: TargetSchemaTab,
  title: 'Data Mapper Components/Side Pane/Target Schema Tab',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof TargetSchemaTab>;

export const Standard: ComponentStory<typeof TargetSchemaTab> = () => <TargetSchemaTab />;
