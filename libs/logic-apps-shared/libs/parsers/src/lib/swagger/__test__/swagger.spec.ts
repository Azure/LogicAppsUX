import { SwaggerParser } from '../parser';
import { Outlook } from './fixtures/outlook';
import type { OpenAPIV2 } from '@microsoft/utils-logic-apps';

describe('Swagger tests', () => {
  it('should be able to successfully parse and dereference swagger', async () => {
    const result = await SwaggerParser.parse(Outlook as OpenAPIV2.Document);
    expect(result).toBeDefined();
  });

  it(`should allow callback Url in header`, async () => {
    const callback = {
      swagger: '2.0',
      info: {
        version: '1.0',
        title: 'CallBackInHeader',
      },
      paths: {
        '/trigger': {
          put: {
            operationId: 'Trigger',
            parameters: [
              {
                name: 'callBackUrl',
                in: 'header',
                type: 'string',
                required: true,
                'x-ms-notification-url': true,
              },
            ],
            responses: {},
          },
        },
      },
    };
    const parser = new SwaggerParser(callback as OpenAPIV2.Document);
    const parameters = parser.getInputParameters('Trigger').byName;
    expect(Object.keys(parameters).length).toBe(1);
    expect(parameters['callBackUrl']['in']).toBe('header');
    expect(parameters['callBackUrl']['isNotificationUrl']).toBe(true);
  });
});
