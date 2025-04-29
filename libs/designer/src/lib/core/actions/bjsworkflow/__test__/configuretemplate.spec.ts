import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { getTemplateConnections, getTemplateParameters } from '../configuretemplate';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, test, expect } from 'vitest';
import { RootState } from '../../../state/templates/store';
import { equals, InitOperationManifestService, InitResourceService, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { delimiter, getLogicAppId } from '../../../configuretemplate/utils/helper';

let spy: any;

describe('actions/configuretemplate', () => {
  let dispatch: ThunkDispatch<unknown, unknown, AnyAction>;
  let mockedState: RootState;
  const workflows = {
    id1: { id: 'id1', manifest: { metadata: { workflowSourceId: 'id1' } } },
    id2: { id: 'id2', manifest: { metadata: { workflowSourceId: 'id2' } } },
  } as any;
  const resourceService = {
    getResource: (id: string) => {
      if (id.endsWith('connections')) {
        return Promise.resolve(standardConnections);
      } else if (id.endsWith('la1')) {
        return Promise.resolve(consumptionWorkflow);
      } else if (id.endsWith('id1')) {
        return Promise.resolve({ properties: { files: { 'workflow.json': workflow1 } } });
      } else if (id.endsWith('id2')) {
        return Promise.resolve({ properties: { files: { 'workflow.json': workflow2 } } });
      } else if (id.endsWith('parameters.json')) {
        return Promise.resolve(standardParameters);
      } else {
        return Promise.resolve({});
      }
    },
  } as any;
  const manifestService = {
    isSupported: (type: string) => {
      return equals(type, 'ServiceProvider') || equals(type, 'Http') || equals(type, 'Request');
    },
    getOperationInfo: (operation: LogicAppsV2.OperationDefinition) => {
      if (equals(operation.type, 'serviceprovider')) {
        return { connectorId: '/serviceProviders/azureaisearch', operationId: 'indexDocument' };
      } else if (equals(operation.type, 'Http')) {
        return { connectorId: '/inapp/http', operationId: 'http' };
      } else if (equals(operation.type, 'Request')) {
        return { connectorId: '/inapp/request', operationId: 'request' };
      }
    },
    getOperationManifest: (connectorId: string) => {
      if (equals(connectorId, '/serviceProviders/azureaisearch')) {
        return { properties: { connectionReference: { referenceKeyFormat: 'serviceprovider' } } };
      }
      return { properties: {} };
    },
  } as any;

  describe('getTemplateConnections', () => {
    beforeEach(() => {
      dispatch = vi.fn();
      mockedState = {
        workflow: {
          subscriptionId: 'sub1',
          resourceGroup: 'rg1',
          workflowAppName: 'wf1',
          logicAppName: 'la1',
          isConsumption: false,
        },
        template: {
          workflows: workflows,
        },
      } as any;
      InitResourceService(resourceService);
      InitOperationManifestService(manifestService);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should return all connections for consumption workflow', async () => {
      const state = { ...mockedState, workflow: { ...mockedState.workflow, isConsumption: true } };
      const result = await getTemplateConnections(state, dispatch, workflows);

      expect(result).toBeDefined();
      expect(result.connections).toEqual({
        'office365-1': { connectorId: '/shared/api1', kind: 'shared' },
      });
      expect(result.mapping).toEqual({
        [`${workflows.id1.id}::::::Get_emails_(V3)`]: 'office365-1',
      });
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            [workflows.id1.id]: expect.objectContaining({
              connectionKeys: ['office365-1'],
            }),
          },
        })
      );
    });

    test('should return only used connections for standard workflows selected in app', async () => {
      const result = await getTemplateConnections(mockedState, dispatch, workflows);

      expect(result).toBeDefined();
      expect(result.connections).toEqual(
        expect.objectContaining({
          'azureaisearch-1': { connectorId: '/serviceProviders/azureaisearch', kind: 'inapp' },
          'office365-1': { connectorId: '/shared/api1', kind: 'shared' },
        })
      );
      expect(result.mapping).toEqual(
        expect.objectContaining({
          'id1::::::Index_a_document': 'azureaisearch-1',
          'id2::::::Get_emails_(V3)': 'office365-1',
        })
      );
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'template/updateAllWorkflowsData',
          payload: expect.objectContaining({
            id1: expect.objectContaining({
              connectionKeys: ['azureaisearch-1'],
            }),
            id2: expect.objectContaining({
              connectionKeys: ['office365-1'],
            }),
          }),
        })
      );
    });
  });

  describe('getTemplateParameters', () => {
    const parameterValueWithToken = [
      {
        id: '1',
        type: 'token',
        token: {
          tokenType: 'fx',
          expression: {
            type: 'Function',
            name: 'concat',
            arguments: [
              { type: 'StringLiteral', value: 'abc' },
              { type: 'Function', name: 'triggerBody', arguments: [] },
            ],
          },
        } as any,
        value: "concat('abc', triggerBody())",
      },
    ];
    const parameterValueWithParameters = [
      {
        id: '1',
        type: 'token',
        token: {
          tokenType: 'fx',
          expression: {
            type: 'Function',
            name: 'concat',
            arguments: [
              { type: 'Function', name: 'parameters', arguments: [{ type: 'StringLiteral', value: 'Parameter_1' }] },
              { type: 'StringLiteral', value: 'abc' },
            ],
          },
        } as any,
        value: "concat(parameters('Parameter_1), parameters('Parameter_2))",
      },
    ];
    const parameterValueWithMultipleParameters = [
      {
        id: '1',
        type: 'token',
        token: {
          tokenType: 'fx',
          expression: {
            type: 'Function',
            name: 'concat',
            arguments: [
              { type: 'StringLiteral', value: 'abc' },
              { type: 'Function', name: 'triggerBody', arguments: [] },
              { type: 'Function', name: 'parameters', arguments: [{ type: 'StringLiteral', value: 'Parameter_1' }] },
            ],
          },
        } as any,
        value: "concat('abc', triggerBody(), parameters('Parameter_1))",
      },
      { id: '2', type: 'token', token: { tokenType: 'parameter', name: 'Parameter_3' } as any, value: "parameters('Parameter_3')" },
    ];
    const mapping = {
      'id1::::::Index_a_document': 'azureaisearch-1',
      'id2::::::Get_emails_(V3)': 'office365-1',
    };
    const consumptionWorkflowParameters = {
      'id2::::::HTTP': {
        parameterGroups: {
          default: {
            parameters: [
              { id: '1', parameterKey: 'body.$.1', parameterName: '1', value: [{ id: '1', type: 'literal', value: 'some value' }] },
              { id: '2', parameterKey: 'body.$.2', parameterName: '2', value: parameterValueWithToken },
            ],
          },
        },
      },
      'id2::::::Get_emails_(V3)': {
        parameterGroups: {
          default: {
            parameters: [
              { id: '3', parameterKey: 'body.$.3', parameterName: '3', value: parameterValueWithParameters },
              {
                id: '4',
                parameterKey: 'body.$.4',
                parameterName: '4',
                value: [
                  {
                    id: '1',
                    type: 'token',
                    token: { tokenType: 'parameter', name: 'Parameter_2' },
                    value: "parameters('Parameter_2')",
                  },
                ],
              },
            ],
          },
        },
      },
    };
    beforeEach(() => {
      mockedState = {
        workflow: {
          subscriptionId: 'sub1',
          resourceGroup: 'rg1',
          workflowAppName: 'wf1',
          logicAppName: 'la1',
          isConsumption: false,
        },
        template: {
          workflows: {
            id1: {
              id: 'id1',
              workflowDefinition: workflow1.definition,
              connectionKeys: [],
              manifest: { metadata: { workflowSourceId: 'id1' } },
            },
            id2: {
              id: 'id2',
              workflowDefinition: workflow2.definition,
              connectionKeys: [],
              manifest: { metadata: { workflowSourceId: 'id2' } },
            },
          },
          connections: {},
          parameterDefinitions: {},
        },
        operation: {
          operationInfo: {
            'id1::::::HTTP': { connectorId: '/inapp/http', operationId: 'http', type: 'Http' },
            'id1::::::Index_a_document': {
              connectorId: '/serviceProviders/azureaisearch',
              operationId: 'indexDocument',
              type: 'ServiceProvider',
            },
            'id1::::::Manual': { connectorId: '/inapp/request', operationId: 'request', type: 'Request' },
          },
          inputParameters: {
            'id1::::::HTTP': {
              parameterGroups: {
                default: {
                  parameters: [
                    { id: '1', parameterKey: 'body.$.1', parameterName: '1', value: [{ id: '1', type: 'literal', value: 'some value' }] },
                    { id: '2', parameterKey: 'body.$.2', parameterName: '2', value: parameterValueWithMultipleParameters },
                  ],
                },
              },
            },
            'id1::::::Index_a_document': {
              parameterGroups: {
                default: {
                  parameters: [
                    { id: '3', parameterKey: 'body.$.3', parameterName: '3', value: [{ id: '1', type: 'literal', value: 'some value' }] },
                  ],
                },
              },
            },
            ...consumptionWorkflowParameters,
          },
          dependencies: {
            'id1::::::HTTP': { inputs: {}, outputs: {} },
            'id1::::::Index_a_document': { inputs: {}, outputs: {} },
            'id2::::::HTTP': { inputs: {}, outputs: {} },
            'id2::::::Get_emails_(V3)': {
              inputs: {
                'body.$.4': { dependencyType: 'ListValues', definition: { type: 'LegacyDynamicValues' } },
              },
            },
          },
        },
      } as any;
      InitResourceService(resourceService);
      InitOperationManifestService(manifestService);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should return only used parameters from consumption workflow', async () => {
      const state = { ...mockedState, workflow: { ...mockedState.workflow, isConsumption: true } } as any;
      state.operation.inputParameters = consumptionWorkflowParameters;

      const result = await getTemplateParameters(state, mapping);
      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toEqual(
        expect.objectContaining({
          Parameter_1: expect.objectContaining({ type: 'String', name: 'Parameter_1', associatedWorkflows: ['id2'] }),
          Parameter_2: expect.objectContaining({
            type: 'String',
            name: 'Parameter_2',
            associatedWorkflows: ['id2'],
            dynamicData: expect.objectContaining({
              workflow: 'id2',
              operation: 'Get_emails_(V3)',
              type: 'list',
              connection: 'office365-1',
            }),
          }),
        })
      );
    });

    test('should return only used parameters for standard workflows selected in app', async () => {
      const result = await getTemplateParameters(mockedState, mapping);
      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(3);
      expect(result).toEqual(
        expect.objectContaining({
          Parameter_1: expect.objectContaining({ type: 'String', name: 'Parameter_1', associatedWorkflows: ['id1', 'id2'] }),
          Parameter_2: expect.objectContaining({
            type: 'String',
            name: 'Parameter_2',
            associatedWorkflows: ['id2'],
            dynamicData: expect.objectContaining({
              workflow: 'id2',
              operation: 'Get_emails_(V3)',
              type: 'list',
              connection: 'office365-1',
            }),
          }),
          Parameter_3: expect.objectContaining({ type: 'String', name: 'Parameter_3', associatedWorkflows: ['id1'] }),
        })
      );
    });
  });
});

const workflow1 = {
  definition: {
    $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
    actions: {
      HTTP: {
        type: 'Http',
        inputs: {
          uri: 'http://uri.com',
          method: 'GET',
          body: "hello@{triggerBody()}abc@{parameters('Parameter_1')}yes@{concat('abc', substring(parameters('Parameter_3'), 'test'))}",
        },
        runAfter: {},
        runtimeConfiguration: {
          contentTransfer: {
            transferMode: 'Chunked',
          },
        },
      },
      Index_a_document: {
        type: 'ServiceProvider',
        inputs: {
          parameters: {
            indexName: 'brbenn-vector',
            document: {
              chunk_id: 'aaa',
            },
          },
          serviceProviderConfiguration: {
            connectionName: 'azureaisearch-1',
            operationId: 'indexDocument',
            serviceProviderId: '/serviceProviders/azureaisearch',
          },
        },
        runAfter: {
          HTTP: ['SUCCEEDED'],
        },
      },
    },
    contentVersion: '1.0.0.0',
    outputs: {},
    triggers: {
      Manual: {
        type: 'Request',
        kind: 'Http',
      },
    },
  },
  kind: 'Stateful',
};

const workflow2 = {
  definition: {
    $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
    actions: {
      HTTP: {
        type: 'Http',
        inputs: {
          uri: 'http://uri.com',
          method: 'GET',
          body: 'hello@{triggerBody()}hello',
        },
        runAfter: {},
        runtimeConfiguration: {
          contentTransfer: {
            transferMode: 'Chunked',
          },
        },
      },
      'Get_emails_(V3)': {
        type: 'ApiConnection',
        inputs: {
          host: {
            connection: {
              referenceName: 'office365-1',
            },
          },
          method: 'get',
          path: '/v3/Mail',
          body: "@concat(parameters('Parameter_1'), parameters('Parameter_2'))",
        },
        runAfter: {
          HTTP: ['SUCCEEDED'],
        },
      },
    },
    contentVersion: '1.0.0.0',
    outputs: {},
    triggers: {
      Manual: {
        type: 'Request',
        kind: 'Http',
      },
    },
  },
  kind: 'Stateful',
};

const consumptionWorkflow = {
  id: 'consumptionWorkflow',
  properties: {
    definition: {
      ...workflow2.definition,
      parameters: {
        $connections: {},
        Parameter_1: { type: 'String', defaultValue: '' },
        Parameter_2: { type: 'String' },
        Parameter_3: { type: 'String' },
        Parameter_4: { type: 'String' },
      },
    },
    parameters: {
      $connections: { value: { 'office365-1': { api: { id: '/shared/api1' } } } },
      Parameter_1: { value: 'test' },
      Parameter_2: { value: 'abc' },
      Parameter_3: { value: 'wer' },
      Parameter_4: { value: '123' },
    },
  },
};

const standardConnections = {
  properties: {
    files: {
      'connections.json': {
        managedApiConnections: { 'office365-1': { api: { id: '/shared/api1' } } },
        serviceProviderConnections: { 'azureaisearch-1': { serviceProvider: { id: '/serviceProviders/azureaisearch' } } },
      },
    },
  },
};

const standardParameters = {
  Parameter_1: { type: 'String', value: 'test' },
  Parameter_2: { type: 'String', value: '123' },
  Parameter_3: { type: 'String', value: 'abc' },
  Parameter_4: { type: 'String', value: '234' },
};
