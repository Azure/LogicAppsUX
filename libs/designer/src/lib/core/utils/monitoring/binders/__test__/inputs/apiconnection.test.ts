import { describe, it, expect, beforeEach } from 'vitest';
import { ApiConnectionInputsBinder } from '../../inputs/index';
import sendEmail from '../../__mocks__/sendEmail';

describe('ApiConnectionInputsBinder', () => {
  let operation;
  let nodeParameters;
  let metadata;
  let binder: ApiConnectionInputsBinder;
  const bindedInputs = {
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
    expect(result).toStrictEqual(bindedInputs);
  });

  it('should get parameter value correctly', async () => {
    const result = await binder.bind(sendEmail.inputs, sendEmail.inputsParametersByName as Record<string, any>);
    expect(result).toStrictEqual(bindedInputs);
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
