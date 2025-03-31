import { ProjectType, TemplateCategory, TemplatePromptResult, type StandardApp } from '@microsoft/vscode-extension-logic-apps';
import { workflowKind, workflowType } from '../../../constants';
import { localize } from '../../../localize';

/**
 * Returns the workflow template based on the provided parameters.
 * @param {string} methodName - The name of the method to be invoked.
 * @param {boolean} isStateful - Indicates whether the workflow is stateful or stateless.
 * @param {string} projectType - The type of the project.
 * @returns The workflow template.
 */
export const getWorkflowTemplate = (methodName: string, isStateful: boolean, projectType: string) => {
  const kind = isStateful ? workflowKind.stateful : workflowKind.stateless;

  const customCodeDefinition: StandardApp = {
    definition: {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      actions: {
        Call_a_local_function_in_this_logic_app: {
          type: 'InvokeFunction',
          inputs: {
            functionName: `${methodName}`,
            parameters: {
              zipCode: 85396,
              temperatureScale: 'Celsius',
            },
          },
          runAfter: {},
        },
        Response: {
          type: 'Response',
          kind: 'http',
          inputs: {
            statusCode: 200,
            body: "@body('Call_a_local_function_in_this_logic_app')",
          },
          runAfter: {
            Call_a_local_function_in_this_logic_app: ['Succeeded'],
          },
        },
      },
      triggers: {
        When_a_HTTP_request_is_received: {
          type: 'Request',
          kind: 'Http',
          inputs: {},
        },
      },
      contentVersion: '1.0.0.0',
      outputs: {},
    },
    kind: kind,
  };

  const rulesCodeDefinition: StandardApp = {
    definition: {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      actions: {
        Call_a_local_rules_function_in_this_logic_app: {
          type: 'InvokeFunction',
          inputs: {
            functionName: `${methodName}`,
            parameters: {
              ruleSetName: 'SampleRuleSet',
              documentType: 'SchemaUser',
              inputXml:
                '<ns0:Root xmlns:ns0="http://BizTalk_Server_Project1.SchemaUser">\n  <UserDetails>\n    <Age>70</Age>\n    <Name>UserName</Name>\n    <zipCode>98053</zipCode>\n  </UserDetails>\n  <Status>\n    <Gold>false</Gold>\n    <Discount>0</Discount>\n  </Status>\n</ns0:Root>',
              purchaseAmount: 1100,
              zipCode: 98052,
            },
          },
          runAfter: {},
        },
        Response: {
          type: 'Response',
          kind: 'http',
          inputs: {
            statusCode: 200,
            body: "@body('Call_a_local_rules_function_in_this_logic_app')",
          },
          runAfter: {
            Call_a_local_rules_function_in_this_logic_app: ['Succeeded'],
          },
        },
      },
      triggers: {
        When_a_HTTP_request_is_received: {
          type: 'Request',
          kind: 'Http',
        },
      },
      contentVersion: '1.0.0.0',
      outputs: {},
    },
    kind: kind,
  };

  return projectType === ProjectType.customCode ? customCodeDefinition : rulesCodeDefinition;
};

/**
 * Retrieves the codeless workflow template based on the statefulness of the workflow.
 * @param {boolean} isStateful - A boolean indicating whether the workflow is stateful or not.
 * @returns The codeless workflow template.
 */
export const getCodelessWorkflowTemplate = (isStateful: boolean) => {
  const kind = isStateful ? workflowKind.stateful : workflowKind.stateless;

  const emptyCodelessDefinition: StandardApp = {
    definition: {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      actions: {},
      contentVersion: '1.0.0.0',
      outputs: {},
      triggers: {},
    },
    kind: kind,
  };

  return emptyCodelessDefinition;
};

export const getWorkflowTemplatePickItems = (language: string, isProjectWizard: boolean) => {
  const picks: any[] = [
    {
      id: workflowType.stateful,
      name: localize('Stateful', 'Stateful workflow'),
      defaultFunctionName: 'Stateful',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    },
    {
      id: workflowType.stateless,
      name: localize('Stateless', 'Stateless workflow'),
      defaultFunctionName: 'Stateless',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    },
    {
      id: workflowType.agentic,
      name: localize('Agentic', 'Agentic workflow'),
      defaultFunctionName: 'Agentic',
      language: language,
      isHttpTrigger: true,
      isTimerTrigger: false,
      userPromptedSettings: [],
      categories: [TemplateCategory.Core],
    },
  ];

  // If this is a project wizard, add an option to skip for now
  if (isProjectWizard) {
    picks.push({
      label: localize('skipForNow', '$(clock) Skip for now'),
      data: TemplatePromptResult.skipForNow,
      suppressPersistence: true,
    });
  }

  return picks;
};
