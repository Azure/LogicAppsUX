import { liquidGroup } from './operationgroups';

const properties = {
  api: {
    id: liquidGroup.id,
    name: liquidGroup.name,
    displayName: liquidGroup.properties.displayName,
    iconUri: liquidGroup.properties.iconUri,
    brandColor: liquidGroup.properties.brandColor,
    description: liquidGroup.properties.description,
  },
  visibility: 'Important',
  operationType: 'Liquid',
  brandColor: liquidGroup.properties.brandColor,
  iconUri: liquidGroup.properties.iconUri,
};

export const liquidJsonToJsonOperation = {
  name: 'liquidJsonToJson',
  id: 'liquidJsonToJson',
  type: 'Liquid',
  properties: {
    ...properties,
    summary: 'Transform JSON To JSON',
    description: 'Transform JSON to JSON using Liquid map.',
    operationKind: 'JsonToJson',
  },
};

export const liquidJsonToTextOperation = {
  name: 'liquidJsonToText',
  id: 'liquidJsonToText',
  type: 'Liquid',
  properties: {
    ...properties,
    summary: 'Transform JSON To TEXT',
    description: 'Transform JSON to TEXT using Liquid map.',
    operationKind: 'JsonToText',
  },
};

export const liquidXmlToJsonOperation = {
  name: 'liquidXmlToJson',
  id: 'liquidXmlToJson',
  type: 'Liquid',
  properties: {
    ...properties,
    summary: 'Transform XML To JSON',
    description: 'Transform XML to JSON using Liquid map.',
    operationKind: 'XmlToJson',
  },
};

export const liquidXmlToTextOperation = {
  name: 'liquidXmlToText',
  id: 'liquidXmlToText',
  type: 'Liquid',
  properties: {
    ...properties,
    summary: 'Transform XML To TEXT',
    description: 'Transform XML to TEXT using Liquid map.',
    operationKind: 'XmlToText',
  },
};
