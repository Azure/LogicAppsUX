import type { Connector } from '@microsoft-logic-apps/utils';

export const ConnectorsMock: Connector[] = [
  {
    name: 'shared_dropbox',
    id: '/providers/Microsoft.PowerApps/apis/shared_dropbox',
    type: '/providers/Microsoft.PowerApps/apis',
    properties: {
      displayName: 'Dropbox',
      iconUri: 'https://tip1icons.azureedge.net/dropbox.png',
      environment: 'Shared',
      purpose: 'NotSpecified',
      connectionParameters: {
        token: {
          type: 'oauthSetting',
          oAuthSettings: {
            identityProvider: 'dropbox',
            clientId: '34d1z2joflga5d8',
            scopes: [],
            redirectUrl: 'https://tip1-shared.consent.azure-apim.net/redirect',
            properties: {
              IsFirstParty: 'False',
            },
          },
          uiDefinition: {
            displayName: 'Login with DropBox Credentials',
            description: 'Login with DropBox Credentials',
            tooltip: 'Provide DropBox Credentials',
            constraints: {
              required: 'true',
            },
          },
        },
      },
      swagger: {
        swagger: '2.0',
        info: {
          version: '1.0',
          title: 'Dropbox',
          description:
            'Connect to Dropbox to manage your files. You can perform various actions such as upload, update, get, and delete files in Dropbox.',
        },
        host: 'tip1-shared.azure-apim.net',
        basePath: '/apim/dropbox',
        schemes: ['https'],
        paths: {
          '/{connectionId}/$metadata.json/datasets': {
            get: {
              tags: ['DropboxDataSetsMetadata'],
              operationId: 'GetDataSetsMetadata',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/DataSetsMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
              ],
            },
          },
          '/{connectionId}/datasets/default/files/{id}': {
            get: {
              tags: ['DropboxFileData'],
              summary: 'Get file metadata using id',
              description: 'Retrieves file metadata from Dropbox using file id',
              operationId: 'GetFileMetadata',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'id',
                  in: 'path',
                  description: 'Specify the file',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: false,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Id',
                  },
                  'x-ms-summary': 'File',
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/BlobMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'advanced',
            },
            put: {
              tags: ['DropboxFileData'],
              summary: 'Update file',
              description: 'Updates a file in Dropbox',
              operationId: 'UpdateFile',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'id',
                  in: 'path',
                  description: 'Specify the file to update',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: false,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Id',
                  },
                  'x-ms-summary': 'File',
                  type: 'string',
                },
                {
                  name: 'body',
                  in: 'body',
                  description: 'Content of the file to update in Dropbox',
                  required: true,
                  schema: {
                    format: 'binary',
                    type: 'string',
                  },
                  'x-ms-summary': 'File content',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/BlobMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
            },
            delete: {
              tags: ['DropboxFileData'],
              summary: 'Delete file',
              description: 'Deletes a file from Dropbox',
              operationId: 'DeleteFile',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'id',
                  in: 'path',
                  description: 'Specify the file to delete',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: false,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Id',
                  },
                  'x-ms-summary': 'File',
                  type: 'string',
                },
              ],
              responses: {
                '200': { description: 'OK' },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
            },
          },
          '/{connectionId}/datasets/default/GetFileByPath': {
            get: {
              tags: ['DropboxFileData'],
              summary: 'Get file metadata using path',
              description: 'Retrieves file metadata from Dropbox using path',
              operationId: 'GetFileMetadataByPath',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'path',
                  in: 'query',
                  description: 'Unique path to the file in Dropbox',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: false,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Path',
                  },
                  'x-ms-summary': 'File path',
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/BlobMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'advanced',
            },
          },
          '/{connectionId}/datasets/default/GetFileContentByPath': {
            get: {
              tags: ['DropboxFileData'],
              summary: 'Get file content using path',
              description: 'Retrieves file contents from Dropbox using path',
              operationId: 'GetFileContentByPath',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'path',
                  in: 'query',
                  description: 'Unique path to the file in Dropbox',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: false,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Path',
                  },
                  'x-ms-summary': 'File path',
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    format: 'binary',
                    type: 'string',
                    'x-ms-summary': 'File content',
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
            },
          },
          '/{connectionId}/datasets/default/files/{id}/content': {
            get: {
              tags: ['DropboxFileData'],
              summary: 'Get file content using id',
              description: 'Retrieves file contents from Dropbox using id',
              operationId: 'GetFileContent',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'id',
                  in: 'path',
                  description: 'Specify the file',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: false,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Id',
                  },
                  'x-ms-summary': 'File',
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    format: 'binary',
                    type: 'string',
                    'x-ms-summary': 'File content',
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
            },
          },
          '/{connectionId}/datasets/default/files': {
            post: {
              tags: ['DropboxFileData'],
              summary: 'Create file',
              description: 'Uploads a file to Dropbox',
              operationId: 'CreateFile',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'folderPath',
                  in: 'query',
                  description: 'Folder path to upload the file to Dropbox',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: true,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Path',
                  },
                  'x-ms-summary': 'Folder path',
                  type: 'string',
                },
                {
                  name: 'name',
                  in: 'query',
                  description: 'Name of the file to create in Dropbox',
                  required: true,
                  'x-ms-summary': 'File name',
                  type: 'string',
                },
                {
                  name: 'body',
                  in: 'body',
                  description: 'Content of the file to upload to Dropbox',
                  required: true,
                  schema: {
                    format: 'binary',
                    type: 'string',
                  },
                  'x-ms-summary': 'File content',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/BlobMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'important',
            },
          },
          '/{connectionId}/datasets/default/copyFile': {
            post: {
              tags: ['DropboxFileData'],
              summary: 'Copy file',
              description: 'Copies a file to Dropbox',
              operationId: 'CopyFile',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'source',
                  in: 'query',
                  description: 'Url to source file',
                  required: true,
                  'x-ms-summary': 'Source url',
                  type: 'string',
                },
                {
                  name: 'destination',
                  in: 'query',
                  description: 'Destination file path in Dropbox, including target filename',
                  required: true,
                  'x-ms-summary': 'Destination file path',
                  type: 'string',
                },
                {
                  name: 'overwrite',
                  in: 'query',
                  description: "Overwrites the destination file if set to 'true",
                  required: false,
                  'x-ms-summary': 'Overwrite?',
                  type: 'boolean',
                  default: false,
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/BlobMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'advanced',
            },
          },
          '/{connectionId}/api/blob/files/{id}': {
            get: {
              tags: ['DropboxFileData'],
              operationId: 'GetFileMetadata_Old',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/BlobMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
            },
            put: {
              tags: ['DropboxFileData'],
              operationId: 'UpdateFile_Old',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  type: 'string',
                },
                {
                  name: 'body',
                  in: 'body',
                  required: true,
                  schema: {
                    format: 'binary',
                    type: 'string',
                  },
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/BlobMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
            },
            delete: {
              tags: ['DropboxFileData'],
              operationId: 'DeleteFile_Old',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  type: 'string',
                },
              ],
              responses: {
                '200': { description: 'OK' },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
            },
          },
          '/{connectionId}/api/blob/GetFileByPath': {
            get: {
              tags: ['DropboxFileData'],
              operationId: 'GetFileMetadataByPath_Old',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'path',
                  in: 'query',
                  required: true,
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/BlobMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
            },
          },
          '/{connectionId}/api/blob/GetFileContentByPath': {
            get: {
              tags: ['DropboxFileData'],
              operationId: 'GetFileContentByPath_Old',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'path',
                  in: 'query',
                  required: true,
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    format: 'binary',
                    type: 'string',
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
            },
          },
          '/{connectionId}/api/blob/files/{id}/content': {
            get: {
              tags: ['DropboxFileData'],
              operationId: 'GetFileContent_Old',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    format: 'binary',
                    type: 'string',
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
            },
          },
          '/{connectionId}/api/blob/files': {
            post: {
              tags: ['DropboxFileData'],
              operationId: 'CreateFile_Old',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'folderPath',
                  in: 'query',
                  required: true,
                  type: 'string',
                },
                {
                  name: 'name',
                  in: 'query',
                  required: true,
                  type: 'string',
                },
                {
                  name: 'body',
                  in: 'body',
                  required: true,
                  schema: {
                    format: 'binary',
                    type: 'string',
                  },
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/BlobMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
            },
          },
          '/{connectionId}/api/blob/copyFile': {
            post: {
              tags: ['DropboxFileData'],
              operationId: 'CopyFile_Old',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'source',
                  in: 'query',
                  required: true,
                  type: 'string',
                },
                {
                  name: 'destination',
                  in: 'query',
                  required: true,
                  type: 'string',
                },
                {
                  name: 'overwrite',
                  in: 'query',
                  required: false,
                  type: 'boolean',
                  default: false,
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: { $ref: '#/definitions/BlobMetadata' },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
            },
          },
          '/{connectionId}/datasets/default/triggers/onnewfile': {
            get: {
              tags: ['DropboxFileDataTrigger'],
              summary: 'When a file is created',
              description: 'Triggers a flow when a new file is created in a Dropbox folder',
              operationId: 'OnNewFile',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'folderId',
                  in: 'query',
                  description: 'Specify a folder',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: true,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Id',
                  },
                  'x-ms-summary': 'Folder',
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    format: 'binary',
                    type: 'string',
                    'x-ms-summary': 'File content',
                  },
                  headers: {
                    'x-ms-file-id': {
                      description: 'File identifier',
                      type: 'string',
                    },
                    'x-ms-file-name': {
                      description: 'File name',
                      type: 'string',
                    },
                    'x-ms-file-path': {
                      description: 'File path',
                      type: 'string',
                    },
                    'x-ms-file-etag': {
                      description: 'File entity tag',
                      type: 'string',
                    },
                    'Content-Type': {
                      description: 'File content type',
                      type: 'string',
                    },
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'important',
              'x-ms-trigger': 'single',
              'x-ms-trigger-hint': 'To see it work now, add a file to the Dropbox folder you selected.',
            },
          },
          '/{connectionId}/datasets/default/triggers/onupdatedfile': {
            get: {
              tags: ['DropboxFileDataTrigger'],
              summary: 'When a file is modified',
              description: 'Triggers a flow when a file is modified in a Dropbox folder',
              operationId: 'OnUpdatedFile',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'folderId',
                  in: 'query',
                  description: 'Specify a folder',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: true,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Id',
                  },
                  'x-ms-summary': 'Folder',
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    format: 'binary',
                    type: 'string',
                    'x-ms-summary': 'File content',
                  },
                  headers: {
                    'x-ms-file-id': {
                      description: 'File identifier',
                      type: 'string',
                    },
                    'x-ms-file-name': {
                      description: 'File name',
                      type: 'string',
                    },
                    'x-ms-file-path': {
                      description: 'File path',
                      type: 'string',
                    },
                    'x-ms-file-etag': {
                      description: 'File entity tag',
                      type: 'string',
                    },
                    'Content-Type': {
                      description: 'File content type',
                      type: 'string',
                    },
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-trigger': 'single',
              'x-ms-trigger-hint': 'To see it work now, modify a file in the Dropbox folder you selected.',
            },
          },
          '/{connectionId}/api/trigger/onnewfile': {
            get: {
              tags: ['DropboxFileDataTrigger'],
              operationId: 'OnNewFile_Old',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'folderId',
                  in: 'query',
                  required: true,
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    format: 'binary',
                    type: 'string',
                  },
                  headers: {
                    'x-ms-file-id': {
                      description: 'File identifier',
                      type: 'string',
                    },
                    'x-ms-file-name': {
                      description: 'File name',
                      type: 'string',
                    },
                    'x-ms-file-path': {
                      description: 'File path',
                      type: 'string',
                    },
                    'x-ms-file-etag': {
                      description: 'File entity tag',
                      type: 'string',
                    },
                    'Content-Type': {
                      description: 'File content type',
                      type: 'string',
                    },
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
              'x-ms-trigger': 'single',
            },
          },
          '/{connectionId}/api/trigger/onupdatedfile': {
            get: {
              tags: ['DropboxFileDataTrigger'],
              operationId: 'OnUpdatedFile_Old',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'folderId',
                  in: 'query',
                  required: true,
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    format: 'binary',
                    type: 'string',
                  },
                  headers: {
                    'x-ms-file-id': {
                      description: 'File identifier',
                      type: 'string',
                    },
                    'x-ms-file-name': {
                      description: 'File name',
                      type: 'string',
                    },
                    'x-ms-file-path': {
                      description: 'File path',
                      type: 'string',
                    },
                    'x-ms-file-etag': {
                      description: 'File entity tag',
                      type: 'string',
                    },
                    'Content-Type': {
                      description: 'File content type',
                      type: 'string',
                    },
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
              'x-ms-trigger': 'single',
            },
          },
          '/{connectionId}/datasets/default/folders/{id}': {
            get: {
              tags: ['DropboxFolderData'],
              summary: 'List files and folders in folder',
              description: 'Lists files and folders in a Dropbox folder',
              operationId: 'ListFolder',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'id',
                  in: 'path',
                  description: 'Specify the folder',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: true,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Id',
                  },
                  'x-ms-summary': 'Folder',
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/BlobMetadata' },
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'important',
            },
          },
          '/{connectionId}/datasets/default/folders': {
            get: {
              tags: ['DropboxFolderData'],
              summary: 'List files and folders in root folder',
              description: 'Lists files and folders in the Dropbox root folder',
              operationId: 'ListRootFolder',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/BlobMetadata' },
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'advanced',
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
              ],
            },
          },
          '/{connectionId}/datasets/default/rootfolders': {
            get: {
              tags: ['DropboxFolderData'],
              operationId: 'ListAllRootFolders',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/BlobMetadata' },
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
              ],
            },
          },
          '/{connectionId}/datasets/default/extractFolderV2': {
            post: {
              tags: ['DropboxFolderData'],
              summary: 'Extract archive to folder',
              description: 'Extracts an archive file into a folder in Dropbox (example: .zip)',
              operationId: 'ExtractFolderV2',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'source',
                  in: 'query',
                  description: 'Path to the archive file',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: false,
                      fileFilter: ['application/zip', 'application/x-zip-compressed'],
                      dataset: null,
                    },
                    'value-path': 'Path',
                  },
                  'x-ms-summary': 'Source archive file path',
                  type: 'string',
                },
                {
                  name: 'destination',
                  in: 'query',
                  description: 'Path in Dropbox to extract the archive contents',
                  required: true,
                  'x-ms-dynamic-values': {
                    capability: 'file-picker',
                    parameters: {
                      isFolder: true,
                      fileFilter: [],
                      dataset: null,
                    },
                    'value-path': 'Path',
                  },
                  'x-ms-summary': 'Destination folder path',
                  type: 'string',
                },
                {
                  name: 'overwrite',
                  in: 'query',
                  description: "Overwrites the destination files if set to 'true",
                  required: false,
                  'x-ms-summary': 'Overwrite?',
                  type: 'boolean',
                  default: false,
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/BlobMetadata' },
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'advanced',
            },
          },
          '/{connectionId}/api/blob/folders/{id}': {
            get: {
              tags: ['DropboxFolderData'],
              operationId: 'ListFolder_Old',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  type: 'string',
                },
              ],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/BlobMetadata' },
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
            },
          },
          '/{connectionId}/api/blob/folders': {
            get: {
              tags: ['DropboxFolderData'],
              operationId: 'ListRootFolder_Old',
              consumes: [],
              produces: ['application/json', 'text/json', 'application/xml', 'text/xml'],
              responses: {
                '200': {
                  description: 'OK',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/BlobMetadata' },
                  },
                },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
              ],
            },
          },
          '/{connectionId}/api/blob/extractFolder': {
            post: {
              tags: ['DropboxFolderData'],
              operationId: 'ExtractFolder_Old',
              consumes: [],
              produces: [],
              parameters: [
                {
                  name: 'connectionId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  'x-ms-visibility': 'internal',
                },
                {
                  name: 'source',
                  in: 'query',
                  required: true,
                  type: 'string',
                },
                {
                  name: 'destination',
                  in: 'query',
                  required: true,
                  type: 'string',
                },
                {
                  name: 'overwrite',
                  in: 'query',
                  required: false,
                  type: 'boolean',
                  default: false,
                },
              ],
              responses: {
                '200': { description: 'OK' },
                default: { description: 'Operation Failed.' },
              },
              deprecated: false,
              'x-ms-visibility': 'internal',
            },
          },
        },
        definitions: {
          DataSetsMetadata: {
            type: 'object',
            properties: {
              tabular: { $ref: '#/definitions/TabularDataSetsMetadata' },
              blob: { $ref: '#/definitions/BlobDataSetsMetadata' },
            },
          },
          TabularDataSetsMetadata: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              displayName: { type: 'string' },
              urlEncoding: { type: 'string' },
              tableDisplayName: { type: 'string' },
              tablePluralName: { type: 'string' },
            },
          },
          BlobDataSetsMetadata: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              displayName: { type: 'string' },
              urlEncoding: { type: 'string' },
            },
          },
          BlobMetadata: {
            type: 'object',
            properties: {
              Id: { type: 'string' },
              Name: { type: 'string' },
              DisplayName: { type: 'string' },
              Path: { type: 'string' },
              LastModified: {
                format: 'date-time',
                type: 'string',
              },
              Size: {
                format: 'int64',
                type: 'integer',
              },
              MediaType: { type: 'string' },
              IsFolder: { type: 'boolean' },
              ETag: { type: 'string' },
              FileLocator: { type: 'string' },
            },
          },
          Object: {
            type: 'object',
            properties: {},
          },
        },
        'x-ms-capabilities': {
          'file-picker': {
            open: { operationId: 'ListAllRootFolders' },
            browse: {
              operationId: 'ListFolder',
              parameters: { id: { 'value-property': 'Id' } },
            },
            'value-title': 'DisplayName',
            'value-folder-property': 'IsFolder',
            'value-media-property': 'MediaType',
          },
        },
      },
      wadlUrl: `https://pafeblobtip1bl.blob.core.windows.net:443/apiwadls-72f988bf-86f1-41af-91ab-2d7cd011db47/shared:2Ddropbox?sv=2014-02-14&sr=c&sig=rXiw3WwJ%2F
                        %2FuYY3UTRqSV1mC6rYpGRUROkH%2BT8quq3Lo%3D&se=2016-05-21T00%3A03%3A16Z&sp=rl`,
      runtimeUrls: ['https://tip1-shared.azure-apim.net/apim/dropbox'],
      primaryRuntimeUrl: 'https://tip1-shared.azure-apim.net/apim/dropbox',
      metadata: {
        source: 'marketplace',
        brandColor: '#007ee5',
      },
      capabilities: ['blob'],
      description: `DropboxT is a service that keeps your files safe, synced, and easy to share. Connect to Dropbox to manage your files.
                        You can perform various actions such as upload, update, get, and delete files in Dropbox.`,
    },
  },
];
