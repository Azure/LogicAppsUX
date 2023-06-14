export const xmlTransformOperation = {
  name: 'xmlTransform',
  id: 'xmlTransform',
  type: 'xslt',
  properties: {
    api: {
      id: 'connectionProviders/xmlOperations',
      name: 'xmlOperations',
      displayName: 'XML Operations',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/xml.svg',
      brandColor: '#804998',
      description: 'XML Operations',
    },
    summary: 'Transform XML',
    description: 'Transform XML using XSLT map.',
    visibility: 'Important',
    operationType: 'Xslt',
    brandColor: '#804998',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/xml.svg',
    annotation: {
      status: 'Preview',
      family: 'xmlOperations',
    },
  },
};

export const xmlValidationOperation = {
  name: 'xmlValidation',
  id: 'xmlValidation',
  type: 'XmlValidation',
  properties: {
    api: {
      id: 'connectionProviders/xmlOperations',
      name: 'xmlOperations',
      displayName: 'XML Operations',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/xml.svg',
      brandColor: '#804998',
      description: 'XML Operations',
    },
    summary: 'XML Validation',
    description: 'Validate XML using schema.',
    visibility: 'Important',
    operationType: 'XmlValidation',
    brandColor: '#804998',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/xml.svg',
    annotation: {
      status: 'Preview',
      family: 'xmlOperations',
    },
  },
};
