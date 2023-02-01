import { NormalizedDataType, SchemaNodeProperty, SchemaType } from '../../models';
import type { SchemaCardProps } from './SchemaCard';
import { SchemaCard } from './SchemaCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import type { NodeProps } from 'reactflow';
import { ReactFlowProvider } from 'reactflow';

export default {
  component: SchemaCard,
  title: 'Data Mapper Components/Card/Schema Card',
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
      fullName: 'key',
      namespacePrefix: '',
      namespaceUri: '',
      normalizedDataType: NormalizedDataType.String,
      properties: SchemaNodeProperty.NotSpecified,
      nodeProperties: [SchemaNodeProperty.NotSpecified],
      children: [],
      pathToRoot: [],
    },
    schemaType: SchemaType.Source,
    displayHandle: false,
    isLeaf: false,
    isChild: false,
    displayChevron: false,
    relatedConnections: [],
    onClick: () => console.log('Schema card clicked'),
    disabled: false,
    error: false,
  },
};
