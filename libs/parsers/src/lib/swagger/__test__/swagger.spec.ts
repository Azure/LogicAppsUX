import { SwaggerParser } from '../parser';
import { Outlook } from './fixtures/outlook.spec';

describe('Swagger tests', () => {
  it('should be able to successfully parse and dereference swagger', async () => {
    const result = await SwaggerParser.parse(Outlook as OpenAPIV2.Document);
    expect(result).toBeDefined();
  });
});
