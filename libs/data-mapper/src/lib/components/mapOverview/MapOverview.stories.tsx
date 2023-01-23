import type { SchemaExtended } from '../../models/Schema';
import { NormalizedDataType, SchemaFileFormat, SchemaNodeProperty } from '../../models/Schema';
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
        normalizedDataType: NormalizedDataType.Integer,
        properties: SchemaNodeProperty.NotSpecified,
        nodeProperties: [SchemaNodeProperty.NotSpecified],
        children: [],
      },
    ],
  },
};

// Will be used once storybook properly updated
console.log(schema);

export const Standard: ComponentStory<typeof MapOverview> = () => <MapOverview />;
