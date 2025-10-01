import { ProjectType, type StandardApp } from '@microsoft/vscode-extension-logic-apps';
import { WorkflowKind, WorkflowType } from '../../../constants';
import * as fs from 'fs-extra';
import * as path from 'path';
import { equals } from '@microsoft/logic-apps-shared';

/**
 * Gets the codeless workflow template.
 * @param {ProjectType} projectType - The type of the project (regular/custom code/rules engine).
 * @param {WorkflowType} workflowType - The kind of the workflow (stateful/stateless/agentic).
 * @param {string} [functionName] - The name of the function to be invoked (custom code and rules engine only).
 * @returns {StandardApp} - The codeless workflow template.
 */
export function getCodelessWorkflowTemplate(
  projectType: ProjectType,
  workflowType: WorkflowType,
  functionName?: string,
  isConsumption?: boolean
): StandardApp {
  const workflowKind = getWorkflowStateType(workflowType);

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

  if (projectType === ProjectType.logicApp && isConsumption && workflowType === WorkflowType.agentic) {
    return {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        contentVersion: '1.0.0.0',
        actions: {
          Agent_1: {
            type: 'Agent',
            runAfter: {},
            tools: {},
            inputs: {
              parameters: {
                modelId: '',
                systemInstructions: '',
                userInstructions: [],
                agentHistoryReductionType: 'tokenCountReduction',
                maximumTokenCount: 128000,
              },
            },
          },
        },
        triggers: {
          manual: {
            type: 'Request',
            kind: 'Button',
            inputs: {},
          },
        },
        outputs: {},
      },
      kind: workflowKind,
      metadata: { AgentType: 'Autonomous' },
    } as any;
  }

  if (projectType === ProjectType.logicApp && isConsumption && workflowType === WorkflowType.agent) {
    return {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        contentVersion: '1.0.0.0',
        actions: {
          Agent_1: {
            type: 'Agent',
            runAfter: {
              When_a_new_chat_session_started: ['Succeeded'],
            },
            tools: {},
            inputs: {
              parameters: {
                modelId: '',
                systemInstructions: '',
                userInstructions: [],
                agentHistoryReductionType: 'tokenCountReduction',
                maximumTokenCount: 128000,
              },
            },
          },
        },
        triggers: {
          When_a_new_chat_session_started: {
            type: 'Request',
            kind: 'Agent',
            inputs: {},
            // Add a custom property to mark as undeletable
            metadata: { undeletable: true },
          },
        },
        outputs: {},
      },
      kind: workflowKind,
      metadata: { AgentType: 'Conversational' },
    } as any;
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

  if (workflowType === WorkflowType.agentic || workflowType === WorkflowType.agent) {
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
            runAfter:
              workflowKind === WorkflowKind.agent
                ? {
                    When_a_new_chat_session_starts: ['Succeeded'],
                  }
                : {},
          },
        },
        triggers:
          workflowKind === WorkflowKind.agent
            ? {
                When_a_new_chat_session_starts: {
                  type: 'Request',
                  kind: 'Agent',
                },
              }
            : baseDefinition.definition.triggers,
      },
      kind: workflowKind,
    };
  }

  return baseDefinition;
}

/**
 * Gets the codeful workflow template.
 * @returns {Promise<string>} - A promise that resolves to the codeful workflow template string.
 */
export async function getCodefulWorkflowTemplate(): Promise<string> {
  const templatePath = path.join(__dirname, 'assets', 'CodefulWorkflowTemplate', 'codefulTemplate.cs');
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  return templateContent;
}

/**
 * Determines the workflow kind based on the provided workflow type.
 * @param workflowType - The type of workflow to evaluate
 * @returns The corresponding WorkflowKind enum value. Returns WorkflowKind.stateful as the default
 */
const getWorkflowStateType = (workflowType: WorkflowType): WorkflowKind => {
  if (equals(workflowType, WorkflowType.stateful, true)) {
    return WorkflowKind.stateful;
  }
  if (equals(workflowType, WorkflowType.stateless, true)) {
    return WorkflowKind.stateless;
  }
  if (equals(workflowType, WorkflowType.agentic, true)) {
    return WorkflowKind.stateful;
  }
  if (equals(workflowType, WorkflowType.agent, true)) {
    return WorkflowKind.agent;
  }
  return WorkflowKind.stateful;
};
