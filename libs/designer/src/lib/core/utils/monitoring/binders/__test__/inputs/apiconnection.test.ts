import { describe, it, expect, beforeEach } from 'vitest';
import { ApiConnectionInputsBinder } from '../../inputs/index';
import sendEmail from '../../__mocks__/sendEmail';
import createBlob from '../../__mocks__/createBlob';

describe('ApiConnectionInputsBinder', () => {
  let operation;
  let nodeParameters;
  let metadata;
  let binder: ApiConnectionInputsBinder;

  describe('Send Email', () => {
    const bindedInputsSendEmail = {
      To: {
        displayName: 'To',
        value: 'user@contoso.com',
      },
      Subject: {
        displayName: 'Subject',
        value: 'Good morning',
      },
      Body: {
        displayName: 'Body',
        value: '<p class="editor-paragraph">Hello there</p>',
      },
      Importance: {
        displayName: 'Importance',
        value: 'Normal',
        visibility: 'advanced',
      },
    };

    beforeEach(() => {
      nodeParameters = sendEmail.nodeParameters;
      metadata = sendEmail.operationMetadata;
      operation = sendEmail.operation;
      binder = new ApiConnectionInputsBinder(operation, nodeParameters, metadata);
    });

    it('should bind inputs correctly', async () => {
      const result = await binder.bind(sendEmail.inputs, sendEmail.inputsParametersByName as Record<string, any>);
      expect(result).toStrictEqual(bindedInputsSendEmail);
    });

    it('should get parameter value correctly', async () => {
      const result = await binder.bind(sendEmail.inputs, sendEmail.inputsParametersByName as Record<string, any>);
      expect(result).toStrictEqual(bindedInputsSendEmail);
    });

    it('should handle untyped inputs correctly', async () => {
      binder = new ApiConnectionInputsBinder(undefined as any, nodeParameters, metadata);

      const result = await binder.bind(sendEmail.inputs, sendEmail.inputsParametersByName as Record<string, any>);
      expect(result).toEqual({
        body: {
          displayName: 'Body',
          value: {
            Body: '<p class="editor-paragraph">Hello there</p>',
            Importance: 'Normal',
            Subject: 'Good morning',
            To: 'user@contoso.com',
          },
        },
        host: {
          displayName: 'Host',
          value: {
            connection: {
              referenceName: 'office365',
            },
          },
        },
        method: {
          displayName: 'Method',
          value: 'post',
        },
        path: {
          displayName: 'Path',
          value: '/v2/Mail',
        },
      });
    });

    it('should handle untyped inputs correctly without inputs', async () => {
      binder = new ApiConnectionInputsBinder(undefined as any, nodeParameters, metadata);

      const result = await binder.bind({}, sendEmail.inputsParametersByName as Record<string, any>);
      expect(result).toEqual({});
    });
  });

  describe('Create blob', () => {
    const bindedInputsCreateBlob = {
      dataset: {
        displayName: 'Storage account name or blob endpoint',
        value: 'Use connection settings(consumptioncharlie)',
      },
      folderPath: {
        displayName: 'Folder path',
        value: '/test1',
      },
      name: {
        displayName: 'Blob name',
        value: 'test1',
      },
      body: {
        displayName: 'Blob content',
        value: '{"TEST":1}',
      },
      queryParametersSingleEncoded: {
        displayName: 'queryParametersSingleEncoded',
        value: 'True',
        visibility: 'internal',
      },
      ReadFileMetadataFromServer: {
        displayName: 'ReadFileMetadataFromServer',
        value: 'True',
        visibility: 'internal',
      },
    };

    beforeEach(() => {
      nodeParameters = createBlob.nodeParameters;
      metadata = createBlob.operationMetadata;
      operation = createBlob.operation;
      binder = new ApiConnectionInputsBinder(operation, nodeParameters, metadata);
    });

    it('should bind inputs correctly', async () => {
      const result = await binder.bind(createBlob.inputs, createBlob.inputsParametersByName as Record<string, any>);
      expect(result).toStrictEqual(bindedInputsCreateBlob);
    });

    it('should get parameter value correctly', async () => {
      const result = await binder.bind(createBlob.inputs, createBlob.inputsParametersByName as Record<string, any>);
      expect(result).toStrictEqual(bindedInputsCreateBlob);
    });

    it('should handle untyped inputs correctly', async () => {
      binder = new ApiConnectionInputsBinder(undefined as any, nodeParameters, metadata);

      const result = await binder.bind(createBlob.inputs, createBlob.inputsParametersByName as Record<string, any>);

      expect(result).toStrictEqual({
        body: {
          displayName: 'Body',
          value: '{"TEST":1}',
        },
        headers: {
          displayName: 'Headers',
          format: 'key-value-pairs',
          value: {
            ReadFileMetadataFromServer: 'True',
          },
        },
        host: {
          displayName: 'Host',
          value: {
            connection: {
              referenceName: 'azureblob-1',
            },
          },
        },
        method: {
          displayName: 'Method',
          value: 'post',
        },
        path: {
          displayName: 'Path',
          value: '/v2/datasets/AccountNameFromSettings/files',
        },
        queries: {
          displayName: 'Queries',
          value: {
            folderPath: '/test1',
            name: 'test1',
            queryParametersSingleEncoded: 'True',
          },
        },
      });
    });

    it('should handle untyped inputs correctly without inputs', async () => {
      binder = new ApiConnectionInputsBinder(undefined as any, nodeParameters, metadata);

      const result = await binder.bind({}, createBlob.inputsParametersByName as Record<string, any>);
      expect(result).toEqual({});
    });
  });
});
