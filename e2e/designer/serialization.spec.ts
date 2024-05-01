import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';
import { getSerializedWorkflowFromState } from './utils/designerFunctions';
test.describe(
  'Serialization Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should serialize the workflow after deserializing it and match', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');

      const serialized: any = await getSerializedWorkflowFromState(page);

      const mock = await import('../../__mocks__/workflows/Panel.json', {
        assert: { type: 'json' },
      });

      expect({
        connectionReferences: mock.default.connectionReferences,
        parameters: mock.default.parameters,
        definition: mock.default.definition,
      }).toEqual(serialized as any);
    });

    test('Should serialize the workflow after deserializing it and match with a switch statement', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Switch');

      const serialized: any = await getSerializedWorkflowFromState(page);

      const mock = await import('../../__mocks__/workflows/Switch.json', {
        assert: { type: 'json' },
      });

      expect({ connectionReferences: {}, parameters: {}, definition: mock.default.definition }).toEqual(serialized as any);
    });

    test('Should serialize the workflow after deserializing it and match with some strings and keys containing unicode characters', async ({
      page,
    }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Unicode Keys');

      const serialized: any = await getSerializedWorkflowFromState(page);

      const mock = await import('../../__mocks__/workflows/UnicodeKeys.json', {
        assert: { type: 'json' },
      });

      expect({ connectionReferences: {}, parameters: {}, definition: mock.default.definition }).toEqual(serialized as any);
    });
  }
);
