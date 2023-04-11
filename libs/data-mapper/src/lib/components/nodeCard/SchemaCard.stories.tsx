import { store } from '../../core/state/Store';
import { NormalizedDataType, SchemaNodeProperty, SchemaType } from '../../models';
import type { SchemaCardProps } from './SchemaCard';
import { SchemaCard } from './SchemaCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';
import type { NodeProps } from 'reactflow';
import { ReactFlowProvider } from 'reactflow';

export default {
  component: SchemaCard,
  title: 'Data Mapper Components/Card/Schema Card',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof SchemaCard>;

export const Standard: ComponentStory<typeof SchemaCard> = (args: NodeProps<SchemaCardProps>) => (
  <div style={{ padding: '10px' }}>
    <ReactFlowProvider>
      <SchemaCard {...args} />
    </ReactFlowProvider>
  </div>
);

Standard.args = {
  data: {
    schemaNode: {
      key: 'key',
      name: 'Name',
      qName: 'key',
      type: NormalizedDataType.String,
      properties: SchemaNodeProperty.None,
      nodeProperties: [SchemaNodeProperty.None],
      children: [],
      pathToRoot: [],
      parentKey: undefined,
      arrayItemIndex: undefined,
    },
    schemaType: SchemaType.Source,
    displayHandle: true,
    isLeaf: false,
    width: 200,
    displayChevron: true,
    onClick: () => console.log('Schema card clicked'),
    disabled: false,
    disableContextMenu: false,
  },
};
