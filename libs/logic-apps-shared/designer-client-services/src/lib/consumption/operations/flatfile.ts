import { flatFileGroup } from './operationgroups';

const api = {
  id: flatFileGroup.id,
  name: flatFileGroup.name,
  displayName: flatFileGroup.properties.displayName,
  iconUri: flatFileGroup.properties.iconUri,
  brandColor: flatFileGroup.properties.brandColor,
  description: flatFileGroup.properties.description,
};

export const flatFileDecodingOperations = {
  name: 'flatFileDecoding',
  id: 'flatFileDecoding',
  type: 'flatFileDecoding',
  properties: {
    api,
    summary: 'Flat File Decoding',
    description: 'Decodes incoming flat file.',
    visibility: 'Important',
    operationType: 'FlatFileDecoding',
    brandColor: api.brandColor,
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/flatfiledecoding.svg',
  },
};

export const flatFileEncodingOperations = {
  name: 'flatFileEncoding',
  id: 'flatFileEncoding',
  type: 'flatFileEncoding',
  properties: {
    api,
    summary: 'Flat File Encoding',
    description: 'Encodes incoming XML file.',
    visibility: 'Important',
    operationType: 'FlatFileEncoding',
    brandColor: api.brandColor,
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/flatfileencoding.svg',
  },
};
