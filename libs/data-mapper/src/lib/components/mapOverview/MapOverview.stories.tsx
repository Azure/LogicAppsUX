import type { SchemaExtended } from '../../models/Schema';
import { SchemaNodeDataType, SchemaNodeProperties, SchemaType } from '../../models/Schema';
import type { MapOverviewProps } from './MapOverview';
import { MapOverview } from './MapOverview';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: MapOverview,
  title: 'Data Mapper/MapOverview',
} as ComponentMeta<typeof MapOverview>;

const schema: SchemaExtended = {
  name: 'Sample',
  type: SchemaType.XML,
  targetNamespace: '',
  namespaces: new Map<string, string>(),
  schemaTreeRoot: {
    key: 'root',
    name: 'Root',
    pathToRoot: [],
    namespacePrefix: '',
    namespaceUri: '',
    schemaNodeDataType: SchemaNodeDataType.ComplexType,
    properties: SchemaNodeProperties.NotSpecified,
    children: [
      {
        key: 'child1',
        name: 'Child 1',
        pathToRoot: [],
        namespacePrefix: '',
        namespaceUri: '',
        schemaNodeDataType: SchemaNodeDataType.String,
        properties: SchemaNodeProperties.NotSpecified,
        children: [],
      },
      {
        key: 'child2',
        name: 'Child 2',
        pathToRoot: [],
        namespacePrefix: '',
        namespaceUri: '',
        schemaNodeDataType: SchemaNodeDataType.Integer,
        properties: SchemaNodeProperties.NotSpecified,
        children: [],
      },
    ],
  },
};

export const Standard: ComponentStory<typeof MapOverview> = (args: MapOverviewProps) => <MapOverview {...args} />;
Standard.args = {
  inputSchema: schema,
  outputSchema: schema,
};

export const InputOnly: ComponentStory<typeof MapOverview> = (args: MapOverviewProps) => <MapOverview {...args} />;
InputOnly.args = {
  inputSchema: schema,
};

export const OutputOnly: ComponentStory<typeof MapOverview> = (args: MapOverviewProps) => <MapOverview {...args} />;
OutputOnly.args = {
  outputSchema: schema,
};
