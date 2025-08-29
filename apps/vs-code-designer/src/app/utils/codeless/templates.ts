import { ProjectType, type StandardApp } from '@microsoft/vscode-extension-logic-apps';
import { WorkflowKind, WorkflowType } from '../../../constants';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Gets the codeless workflow template.
 * @param {ProjectType} projectType - The type of the project (regular/custom code/rules engine).
 * @param {WorkflowType} workflowType - The kind of the workflow (stateful/stateless/agentic).
 * @param {string} [functionName] - The name of the function to be invoked (custom code and rules engine only).
 * @returns {StandardApp} - The codeless workflow template.
 */
export function getCodelessWorkflowTemplate(projectType: ProjectType, workflowType: WorkflowType, functionName?: string): StandardApp {
  // TODO(aeldridge): This uses 'Stateless' workflow kind for Agentic workflows. Is this correct?
  const workflowKind = workflowType === WorkflowType.stateful ? WorkflowKind.stateful : WorkflowKind.stateless;

  if (projectType === ProjectType.customCode) {
    return {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: {
          Call_a_local_function_in_this_logic_app: {
            type: 'InvokeFunction',
            inputs: {
              functionName: `${functionName}`,
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
      kind: workflowKind,
    };
  }

  if (projectType === ProjectType.rulesEngine) {
    return {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: {
          Call_a_local_rules_function_in_this_logic_app: {
            type: 'InvokeFunction',
            inputs: {
              functionName: `${functionName}`,
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
      kind: workflowKind,
    };
  }

  const baseDefinition: StandardApp = {
    definition: {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      contentVersion: '1.0.0.0',
      actions: {},
      outputs: {},
      triggers: {},
    },
    kind: workflowKind,
  };

  if (workflowType === WorkflowType.agentic) {
    return {
      ...baseDefinition,
      definition: {
        ...baseDefinition.definition,
        actions: {
          Default_Agent: {
            type: 'Agent',
            inputs: {
              parameters: {
                deploymentId: '',
                messages: '',
                agentModelType: 'AzureOpenAI',
                agentModelSettings: {
                  agentHistoryReductionSettings: {
                    agentHistoryReductionType: 'maximumTokenCountReduction',
                    maximumTokenCount: 128000,
                  },
                },
              },
              modelConfigurations: {
                model1: {
                  referenceName: '',
                },
              },
            },
            limit: {},
            tools: {},
            runAfter: {},
          },
        },
      },
      kind: WorkflowKind.agentic,
    };
  }

  return baseDefinition;
}

/**
 * Gets the codeful workflow template.
 * @returns {Promise<string>} - A promise that resolves to the codeful workflow template string.
 */
export async function getCodefulWorkflowTemplate(): Promise<string> {
  const templatePath = path.join(__dirname, 'assets', 'codefulTemplates', 'codefulWorkflowTemplate.cs');
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  return templateContent;
}
