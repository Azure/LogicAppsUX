import { getIntl, Template } from '@microsoft/logic-apps-shared';
import { describe, expect, test } from 'vitest';
import { checkWorkflowNameWithRegex, validateTemplateManifestValue, validateWorkflowData } from '../helper';

describe('Template Validation Tests', () => {
  const intl = getIntl();
  describe('checkWorkflowNameWithRegex', () => {
    test('Acceptable names for workflow should pass with undefined', async () => {
      expect(checkWorkflowNameWithRegex(intl, 'workflowName1')).toBe(undefined);
      expect(checkWorkflowNameWithRegex(intl, 'workflowName-1')).toBe(undefined);
      expect(checkWorkflowNameWithRegex(intl, 'workflowName_1')).toBe(undefined);
      expect(checkWorkflowNameWithRegex(intl, 'workflow_Name-1')).toBe(undefined);
      expect(checkWorkflowNameWithRegex(intl, 'workflow0_Name-999')).toBe(undefined);
    });

    test('Acceptable names for workflow should pass with undefined', async () => {
      const nameDoesNotMath = intl.formatMessage({
        defaultMessage: "Name can only contain letters, numbers, and '-', '(', ')', '_' or '.",
        id: 'zMKxg9',
        description: 'Error message when the workflow name is invalid regex.',
      });
      expect(checkWorkflowNameWithRegex(intl, 'workflow name')).toBe(nameDoesNotMath);
      expect(checkWorkflowNameWithRegex(intl, '1workflowName')).toBe(nameDoesNotMath);
      expect(checkWorkflowNameWithRegex(intl, '1_workflowName_1')).toBe(nameDoesNotMath);
      expect(checkWorkflowNameWithRegex(intl, 'workflow_Name space')).toBe(nameDoesNotMath);
      expect(checkWorkflowNameWithRegex(intl, 'workflow_%7')).toBe(nameDoesNotMath);
    });
  });

  describe('validateWorkflowData', () => {
    test('Missing all data with accelearator case', async () => {
      expect(validateWorkflowData({}, true)).toStrictEqual({
        title: intl.formatMessage({
          defaultMessage: 'Workflow display name (title) is required.',
          id: 'WnHWrD',
          description: 'Error message when the workflow display name field which is title is empty',
        }),
        summary: intl.formatMessage({
          defaultMessage: 'Workflow summary is required for publish.',
          id: '1lLI6H',
          description: 'Error message when the workflow description is empty',
        }),
        kinds: intl.formatMessage({
          defaultMessage: 'At least one state type is required for publish.',
          id: 'a21rtJ',
          description: 'Error shown when the State type list is missing or empty',
        }),
        'images.light': intl.formatMessage({
          defaultMessage: 'The light image version of the workflow is required for publish.',
          id: 't/aciw',
          description: 'Error message when the workflow light image is empty',
        }),
        'images.dark': intl.formatMessage({
          defaultMessage: 'The dark image version of the workflow is required for publish.',
          id: 'arjUBV',
          description: 'Error message when the workflow dark image is empty',
        }),
      });
    });

    test('Missing all data with single template case', async () => {
      expect(validateWorkflowData({}, false)).toStrictEqual({
        title: undefined,
        summary: undefined,
        kinds: intl.formatMessage({
          defaultMessage: 'At least one state type is required for publish.',
          id: 'a21rtJ',
          description: 'Error shown when the State type list is missing or empty',
        }),
        'images.light': intl.formatMessage({
          defaultMessage: 'The light image version of the workflow is required for publish.',
          id: 't/aciw',
          description: 'Error message when the workflow light image is empty',
        }),
        'images.dark': intl.formatMessage({
          defaultMessage: 'The dark image version of the workflow is required for publish.',
          id: 'arjUBV',
          description: 'Error message when the workflow dark image is empty',
        }),
      });
    });
  });

  describe('validateTemplateManifestValue', () => {
    test('Missing all data', async () => {
      expect(validateTemplateManifestValue({} as Template.TemplateManifest)).toStrictEqual({
        allowedSkus: intl.formatMessage({
          defaultMessage: 'Atleast one sku is required for publish.',
          id: 'rhBKTF',
          description: 'Error shown when the template skus are empty',
        }),
        title: intl.formatMessage({
          defaultMessage: 'Title is required for publish.',
          id: 't9lUGS',
          description: 'Error shown when the template title is missing or empty',
        }),
        summary: intl.formatMessage({
          defaultMessage: 'Summary is required for publish.',
          id: 'm7tML3',
          description: 'Error shown when the template summary is missing or empty',
        }),
        featuredConnectors: intl.formatMessage({
          defaultMessage: 'At least one featured connector is required for publish.',
          id: 'fQh72N',
          description: 'Error shown when the feature connector field is missing',
        }),
        'details.By': intl.formatMessage({
          defaultMessage: 'By field is required for publish.',
          id: 'pRrzwt',
          description: 'Error shown when the author (By) field is missing',
        }),
      });
    });
  });
});
