const properties = {
  api: {
    id: 'connectionProviders/liquidOperations',
    name: 'liquidOperations',
    displayName: 'Liquid Operations',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/liquid.svg',
    brandColor: '#804998',
    description: 'Liquid Operations',
  },
  visibility: 'Important',
  operationType: 'Liquid',
  brandColor: '#804998',
  iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/liquid.svg',
  annotation: {
    status: 'Preview',
    family: 'liquidOperations',
  },
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
