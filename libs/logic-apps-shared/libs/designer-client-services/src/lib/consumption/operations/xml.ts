import { xmlGroup } from './operationgroups';

const api = {
  id: xmlGroup.id,
  name: xmlGroup.name,
  displayName: xmlGroup.properties.displayName,
  iconUri: xmlGroup.properties.iconUri,
  brandColor: xmlGroup.properties.brandColor,
  description: xmlGroup.properties.description,
};

export const xmlTransformOperation = {
  name: 'xmlTransform',
  id: 'xmlTransform',
  type: 'xslt',
  properties: {
    api,
    summary: 'Transform XML',
    description: 'Transform XML using XSLT map.',
    visibility: 'Important',
    operationType: 'Xslt',
    brandColor: api.brandColor,
    iconUri: api.iconUri,
  },
};

export const xmlValidationOperation = {
  name: 'xmlValidation',
  id: 'xmlValidation',
  type: 'XmlValidation',
  properties: {
    api,
    summary: 'XML Validation',
    description: 'Validate XML using schema.',
    visibility: 'Important',
    operationType: 'XmlValidation',
    brandColor: api.brandColor,
    iconUri: api.iconUri,
  },
};
