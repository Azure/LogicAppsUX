import { test, expect } from '@playwright/test';
import { LoadMockDirect } from './utils/GoToWorkflow';
import { getSerializedWorkflowFromState } from './utils/designerFunctions';
import panelData from '../../__mocks__/workflows/Panel.json' assert { type: 'json' };
import switchData from '../../__mocks__/workflows/Switch.json' assert { type: 'json' };
import unicodeKeysData from '../../__mocks__/workflows/UnicodeKeys.json' assert { type: 'json' };

test.describe(
  'Serialization Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should serialize the workflow after deserializing it and match', async ({ page }) => {
      await LoadMockDirect(page, 'Panel.json');

      const serialized: any = await getSerializedWorkflowFromState(page);

      expect({
        connectionReferences: panelData.connectionReferences,
        parameters: panelData.parameters,
        definition: panelData.definition,
      }).toEqual(serialized as any);
    });

    test('Should serialize the workflow after deserializing it and match with a switch statement', async ({ page }) => {
      await LoadMockDirect(page, 'Switch.json');

      const serialized: any = await getSerializedWorkflowFromState(page);

      expect({ connectionReferences: {}, parameters: {}, definition: switchData.definition }).toEqual(serialized as any);
    });

    test('Should serialize the workflow after deserializing it and match with some strings and keys containing unicode characters', async ({
      page,
    }) => {
      await LoadMockDirect(page, 'UnicodeKeys.json');

      const serialized: any = await getSerializedWorkflowFromState(page);

      expect({ connectionReferences: {}, parameters: {}, definition: unicodeKeysData.definition }).toEqual(serialized as any);
    });
  }
);
