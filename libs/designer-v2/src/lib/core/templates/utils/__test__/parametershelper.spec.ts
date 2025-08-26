import { ConsumptionOperationManifestService, InitConnectionService, InitOperationManifestService } from '@microsoft/logic-apps-shared';
import { afterEach, describe, expect, test, vitest } from 'vitest';
import { getReactQueryClient } from '../../../ReactQueryProvider';
import { testSwagger } from '../../../utils/parameters/__test__/mocks';
import { initializeParametersMetadata } from '../parametershelper';
import { testTemplateManifest, testWorkflowJson } from './mocks';

describe('Templates Parameters Helper', () => {
  describe('initializeParametersMetadata', () => {
    afterEach(() => {
      vitest.clearAllMocks();
      vitest.resetAllMocks();
      vitest.resetModules();
      vitest.restoreAllMocks();

      getReactQueryClient().clear();
    });

    const manifestService = new ConsumptionOperationManifestService({
      baseUrl: 'https://testUrl.com',
      apiVersion: '2022-09-01-preview',
      subscriptionId: 'subId',
      location: 'location',
      httpClient: {} as any,
    });
    const connectionService: any = {
      getSwaggerFromConnector: () => Promise.resolve(testSwagger),
    };
    const templateId = 'templateId';
    test('should initialize operations and template metadata correctly in store when template parameters have dynamic data', async () => {
      InitOperationManifestService(manifestService);
      InitConnectionService(connectionService);

      const templateParameters = testTemplateManifest.parameters.reduce((result, current) => {
        result[current.name] = current;
        return result;
      }, {});
      const xsltNodeId = `${templateId}-default-Transform_XML`;
      const connectorNodeId = `${templateId}-default-Create_alias_for_custom_or_property_lookup`;

      const { inputsPayload, parameterDefinitions } = await initializeParametersMetadata(
        templateId,
        {
          default: {
            id: 'default',
            workflowDefinition: testWorkflowJson,
            manifest: testTemplateManifest as any,
            connectionKeys: ['imanageworkforadmins_#workflowname#'],
            errors: { workflow: undefined, kind: undefined },
            workflowName: undefined,
            kind: undefined,
          },
        },
        templateParameters,
        testTemplateManifest.connections as any,
        { subscriptionId: 'subId', location: 'location' }
      );

      expect(inputsPayload).toBeDefined();
      expect(inputsPayload.length).toBe(2);

      expect(inputsPayload[0].id).toEqual(xsltNodeId);
      expect(inputsPayload[0].operationInfo).toEqual(
        expect.objectContaining({
          type: 'Xslt',
          operationId: 'xmlTransform',
          connectorId: 'connectionProviders/xmlOperations',
        })
      );
      expect(inputsPayload[0].nodeInputs.parameterGroups).toBeDefined();
      expect(Object.keys(inputsPayload[0].nodeDependencies.inputs).length).toBe(2);
      expect(inputsPayload[0].nodeDependencies.inputs['inputs.$.integrationAccount.map.name']).toEqual(
        expect.objectContaining({
          dependencyType: 'ListValues',
        })
      );

      expect(inputsPayload[1].id).toEqual(connectorNodeId);
      expect(inputsPayload[1].operationInfo).toEqual(
        expect.objectContaining({
          type: 'ApiConnection',
          operationId: 'CreateCustomOrPropertyLookup',
          connectorId: '/subscriptions/subid/providers/microsoft.web/locations/location/managedapis/imanageworkforadmins',
        })
      );
      expect(inputsPayload[1].nodeInputs.parameterGroups).toBeDefined();
      expect(Object.keys(inputsPayload[1].nodeDependencies.inputs).length).toBe(3);
      expect(inputsPayload[1].nodeDependencies.inputs['body.$.libraryId']).toEqual(
        expect.objectContaining({
          dependencyType: 'ListValues',
        })
      );
      expect(inputsPayload[1].nodeDependencies.inputs['body.$.lookupFieldId']).toEqual(
        expect.objectContaining({
          dependencyType: 'ListValues',
        })
      );

      expect(parameterDefinitions['mapname_#workflowname#'].associatedOperationParameter).toEqual(
        expect.objectContaining({
          operationId: xsltNodeId,
          parameterId: inputsPayload[0].nodeInputs.parameterGroups['default'].parameters[1].id,
        })
      );
      expect(parameterDefinitions['LibraryId_#workflowname#'].associatedOperationParameter).toEqual(
        expect.objectContaining({
          operationId: connectorNodeId,
          parameterId: inputsPayload[1].nodeInputs.parameterGroups['default'].parameters[0].id,
        })
      );
      expect(parameterDefinitions['LookupField_#workflowname#'].associatedOperationParameter).toEqual(
        expect.objectContaining({
          operationId: connectorNodeId,
          parameterId: inputsPayload[1].nodeInputs.parameterGroups['default'].parameters[1].id,
        })
      );
    });
  });
});
