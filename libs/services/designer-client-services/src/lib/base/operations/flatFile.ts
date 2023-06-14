export const flatFileDecodingOperations = {
  name: 'flatFileDecoding',
  id: 'flatFileDecoding',
  type: 'flatFileDecoding',
  properties: {
    api: {
      id: 'connectionProviders/flatFileOperations',
      name: 'flatFileOperations',
      displayName: 'Flat File',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/flatfiledecoding.svg',
      brandColor: '#e68a00',
      description: 'Flat File',
    },
    summary: 'Flat File Decoding',
    description: 'Decodes incoming flat file.',
    visibility: 'Important',
    operationType: 'FlatFileDecoding',
    brandColor: '#e68a00',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/flatfiledecoding.svg',
    annotation: {
      status: 'Preview',
      family: 'flatFileOperations',
    },
  },
};

export const flatFileEncodingOperations = {
  name: 'flatFileEncoding',
  id: 'flatFileEncoding',
  type: 'flatFileEncoding',
  properties: {
    api: {
      id: 'connectionProviders/flatFileOperations',
      name: 'flatFileOperations',
      displayName: 'Flat File',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/flatfiledecoding.svg',
      brandColor: '#e68a00',
      description: 'Flat File',
    },
    summary: 'Flat File Encoding',
    description: 'Encodes incoming XML file.',
    visibility: 'Important',
    operationType: 'FlatFileEncoding',
    brandColor: '#e68a00',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/flatfileencoding.svg',
    annotation: {
      status: 'Preview',
      family: 'flatFileOperations',
    },
  },
};
