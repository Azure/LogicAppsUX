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
        defaultMessage: "Name can only contain letters, numbers, and ' - ', '(', ')', '_' or '.",
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
        workflow: intl.formatMessage({
          defaultMessage: 'Workflow name is required.',
          id: 'x2z3kg',
          description: 'Error message when the workflow name is empty.',
        }),
        manifest: {
          title: intl.formatMessage({
            defaultMessage: 'Workflow display name (title) is required.',
            id: 'WnHWrD',
            description: 'Error message when the workflow display name field which is title is empty',
          }),
          summary: intl.formatMessage({
            defaultMessage: 'Workflow summary is required.',
            id: 'erGyZT',
            description: 'Error message when the workflow description is empty',
          }),
          kinds: intl.formatMessage({
            defaultMessage: 'At least one state type is required.',
            id: '3+Xsk7',
            description: 'Error shown when the State type list is missing or empty',
          }),
          'images.light': intl.formatMessage({
            defaultMessage: 'Workflow light image is required.',
            id: '1Cds91',
            description: 'Error message when the workflow light image is empty',
          }),
          'images.dark': intl.formatMessage({
            defaultMessage: 'Workflow dark image is required.',
            id: 'k194gz',
            description: 'Error message when the workflow dark image is empty',
          }),
        },
      });
    });

    test('Missing all data with single template case', async () => {
      expect(validateWorkflowData({}, false)).toStrictEqual({
        workflow: intl.formatMessage({
          defaultMessage: 'Workflow name is required.',
          id: 'x2z3kg',
          description: 'Error message when the workflow name is empty.',
        }),
        manifest: {
          title: undefined,
          summary: undefined,
          kinds: intl.formatMessage({
            defaultMessage: 'At least one state type is required.',
            id: '3+Xsk7',
            description: 'Error shown when the State type list is missing or empty',
          }),
          'images.light': intl.formatMessage({
            defaultMessage: 'Workflow light image is required.',
            id: '1Cds91',
            description: 'Error message when the workflow light image is empty',
          }),
          'images.dark': intl.formatMessage({
            defaultMessage: 'Workflow dark image is required.',
            id: 'k194gz',
            description: 'Error message when the workflow dark image is empty',
          }),
        },
      });
    });
  });

  describe('validateTemplateManifestValue', () => {
    test('Missing all data', async () => {
      expect(validateTemplateManifestValue({} as Template.TemplateManifest)).toStrictEqual({
        title: intl.formatMessage({
          defaultMessage: 'Title is required.',
          id: 'oF5+jB',
          description: 'Error shown when the template title is missing or empty',
        }),
        summary: intl.formatMessage({
          defaultMessage: 'Summary is required.',
          id: 'h4OHMi',
          description: 'Error shown when the template summary is missing or empty',
        }),
        'details.By': intl.formatMessage({
          defaultMessage: 'By field is required.',
          id: 'JSWwJH',
          description: 'Error shown when the author (By) field is missing',
        }),
        'details.Category': intl.formatMessage({
          defaultMessage: 'At least one category is required.',
          id: '5GmlRf',
          description: 'Error shown when the Category field is missing',
        }),
      });
    });
  });
});
