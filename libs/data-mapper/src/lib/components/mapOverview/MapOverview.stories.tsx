import type { SchemaExtended } from '../../models/Schema';
import { NormalizedDataType, SchemaFileFormat, SchemaNodeDataType, SchemaNodeProperty } from '../../models/Schema';
import type { MapOverviewProps } from './MapOverview';
import { MapOverview } from './MapOverview';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: MapOverview,
  title: 'Data Mapper Components/Map Overview',
} as ComponentMeta<typeof MapOverview>;

const schema: SchemaExtended = {
  name: 'Sample',
  type: SchemaFileFormat.XML,
  targetNamespace: '',
  namespaces: {},
  schemaTreeRoot: {
    key: 'root',
    name: 'Root',
    fullName: 'Root',
    pathToRoot: [],
    namespacePrefix: '',
    namespaceUri: '',
    schemaNodeDataType: SchemaNodeDataType.None,
    normalizedDataType: NormalizedDataType.ComplexType,
    properties: SchemaNodeProperty.NotSpecified,
    nodeProperties: [SchemaNodeProperty.NotSpecified],
    children: [
      {
        key: 'child1',
        name: 'Child 1',
        fullName: 'Child 1',
        pathToRoot: [],
        namespacePrefix: '',
        namespaceUri: '',
        schemaNodeDataType: SchemaNodeDataType.String,
        normalizedDataType: NormalizedDataType.String,
        properties: SchemaNodeProperty.NotSpecified,
        nodeProperties: [SchemaNodeProperty.NotSpecified],
        children: [],
      },
      {
        key: 'child2',
        name: 'Child 2',
        fullName: 'Child 2',
        pathToRoot: [],
        namespacePrefix: '',
        namespaceUri: '',
        schemaNodeDataType: SchemaNodeDataType.Integer,
        normalizedDataType: NormalizedDataType.Integer,
        properties: SchemaNodeProperty.NotSpecified,
        nodeProperties: [SchemaNodeProperty.NotSpecified],
        children: [],
      },
    ],
  },
};

export const Standard: ComponentStory<typeof MapOverview> = (args: MapOverviewProps) => <MapOverview {...args} />;
Standard.args = {
  sourceSchema: schema,
  targetSchema: schema,
};

export const SourceOnly: ComponentStory<typeof MapOverview> = (args: MapOverviewProps) => <MapOverview {...args} />;
SourceOnly.args = {
  sourceSchema: schema,
};

export const TargetOnly: ComponentStory<typeof MapOverview> = (args: MapOverviewProps) => <MapOverview {...args} />;
TargetOnly.args = {
  targetSchema: schema,
};
