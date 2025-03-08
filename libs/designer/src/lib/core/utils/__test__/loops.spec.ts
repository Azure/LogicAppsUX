import { clone, equals, InitOperationManifestService, TokenType } from '@microsoft/logic-apps-shared';
import { shouldAddForeach } from '../loops';
import * as GraphHelper from '../graph';
import { describe, vi, beforeAll, test, expect } from 'vitest';
import foreachManifest from '../../../../../../logic-apps-shared/src/designer-client-services/lib/base/manifests/foreach';

describe('Loops Utility', () => {
  describe('shouldAddForeach', () => {
    const nodeId = 'nodeId';
    const parameterId = 'parameterId';
    const rootState = {
      operations: {
        operationInfo: {
          [nodeId]: { type: 'ApiConnection', operationId: 'operationId', connectorId: 'connectorId' },
          manual: { type: 'ApiConnection', operationId: 'operationId1', connectorId: 'connectorId1' },
          For_each: { type: 'foreach', operationId: 'operationId2', connectorId: 'connectorId2' },
        },
        inputParameters: {
          [nodeId]: { parameterGroups: {} },
          For_each: {
            parameterGroups: {
              default: {
                id: 'default',
                parameters: [
                  {
                    parameterKey: 'inputs.$.foreach',
                    parameterName: 'foreach',
                    info: {},
                    type: 'array',
                    value: [
                      {
                        id: 'F3863BCC-869D-4E93-A4D8-BA2F95A3F114',
                        type: 'token',
                        token: {
                          source: 'body',
                          name: 'value',
                          key: 'body.$.value',
                          tokenType: 'outputs',
                          title: 'value',
                          value: "triggerBody()?['value']",
                        },
                        value: "triggerBody()?['value']",
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        outputParameters: {
          manual: {
            outputs: {
              'body.$.value.[*].NestedArray': {
                key: 'body.$.value.[*].NestedArray',
                type: 'array',
                name: 'NestedArray',
                isInsideArray: false,
                parentArray: 'value',
                source: 'body',
                required: false,
              },
              'body.$.value.[*].NestedArray.[*].P1': {
                key: 'body.$.value.[*].NestedArray.[*].P1',
                type: 'string',
                name: 'P1',
                isInsideArray: true,
                parentArray: 'NestedArray',
                source: 'body',
                required: false,
              },
            },
          },
        },
        settings: { manual: { splitOn: { isSupported: true, value: { enabled: true, value: "@triggerBody()?['value']" } } } },
      },
      workflow: {
        idReplacements: {},
        nodesMetadata: {
          manual: { graphId: 'root', isRoot: true },
          nodeId: { graphId: 'root', isRoot: false },
        },
      },
    } as any;

    beforeAll(() => {
      InitOperationManifestService({
        isSupported: (type: string) => equals(type, 'foreach'),
        getOperationManifest: () => Promise.resolve(foreachManifest),
      } as any);
    });

    test('should correctly return one implicit foreach when token is in an array is added for splitOn enabled', async () => {
      const token = {
        key: 'body.$.value.[*].NestedArray.[*].P1',
        name: 'P1',
        type: 'string',
        brandColor: 'brandColor',
        title: 'P1',
        value: `item()?['P1']`,
        outputInfo: { arrayDetails: { parentArray: 'NestedArray' }, required: false, source: 'body', type: TokenType.OUTPUTS },
      };
      vi.spyOn(GraphHelper, 'getTriggerNodeId').mockReturnValue('manual');
      let details = await shouldAddForeach(nodeId, parameterId, token, rootState);

      expect(details).toBeDefined();
      expect(details.shouldAdd).toBeTruthy();
      expect(details.arrayDetails).toBeDefined();
      expect(details.arrayDetails).toEqual([
        expect.objectContaining({
          parentArrayKey: 'body.$.value.[*].NestedArray',
          parentArrayValue: "@triggerBody()?['NestedArray']",
        }),
      ]);
      expect(details.repetitionContext).toEqual({
        repetitionReferences: [],
        splitOn: "@triggerBody()?['value']",
      });

      const tokenNotInArray = {
        key: 'body.$.value.[*].P2',
        name: 'P2',
        type: 'string',
        brandColor: 'brandColor',
        title: 'P2',
        value: `triggerBody()?['P2']`,
        outputInfo: { required: false, source: 'body', type: TokenType.OUTPUTS },
      };
      details = await shouldAddForeach(nodeId, parameterId, tokenNotInArray, rootState);
      expect(details).toEqual({ shouldAdd: false });
    });

    test('should correctly return correct implicit foreachs (1 and 2) when token is in an array is added for splitOn disabled', async () => {
      const token = {
        key: 'body.$.value.[*].NestedArray.[*].P1',
        name: 'P1',
        type: 'string',
        brandColor: 'brandColor',
        title: 'P1',
        value: `item()?['P1']`,
        outputInfo: { arrayDetails: { parentArray: 'NestedArrray' }, required: false, source: 'body', type: TokenType.OUTPUTS },
      };
      const state = clone(rootState);
      state.operations.settings['manual'].splitOn.value.enabled = false;
      state.operations.outputParameters['manual'].outputs['body.$.value.[*].NestedArray'].isInsideArray = true;

      vi.spyOn(GraphHelper, 'getTriggerNodeId').mockReturnValue('manual');
      let details = await shouldAddForeach(nodeId, parameterId, token, state);

      expect(details).toBeDefined();
      expect(details.shouldAdd).toBeTruthy();
      expect(details.arrayDetails).toBeDefined();
      expect(details.arrayDetails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ parentArrayKey: 'body.$.value.[*].NestedArray', parentArrayValue: "@item()?['NestedArray']" }),
          expect.objectContaining({ parentArrayKey: 'body.$.value', parentArrayValue: "@triggerBody()['value']" }),
        ])
      );
      expect(details.repetitionContext).toEqual({
        repetitionReferences: [],
        splitOn: undefined,
      });

      const tokenInTopArray = {
        key: 'body.$.value.[*].P2',
        name: 'P2',
        type: 'string',
        brandColor: 'brandColor',
        title: 'P2',
        value: `item()?['P2']`,
        outputInfo: { arrayDetails: { parentArray: 'value' }, required: false, source: 'body', type: TokenType.OUTPUTS },
      };
      details = await shouldAddForeach(nodeId, parameterId, tokenInTopArray, state);
      expect(details).toBeDefined();
      expect(details.shouldAdd).toBeTruthy();
      expect(details.arrayDetails).toBeDefined();
      expect(details.arrayDetails).toEqual([
        expect.objectContaining({ parentArrayKey: 'body.$.value', parentArrayValue: "@triggerBody()['value']" }),
      ]);
      expect(details.repetitionContext).toEqual({
        repetitionReferences: [],
        splitOn: undefined,
      });
    });

    test('should not add any implicit foreach for a node already in a loop when token in an array is added for splitOn enabled', async () => {
      const token = {
        key: 'body.$.value.[*].NestedArray.[*].P1',
        name: 'P1',
        type: 'string',
        brandColor: 'brandColor',
        title: 'P1',
        value: `item()?['P1']`,
        outputInfo: { arrayDetails: { parentArray: 'NestedArray' }, required: false, source: 'body', type: TokenType.OUTPUTS },
      };
      const state = clone(rootState);
      state.workflow.nodesMetadata = {
        ...state.workflow.nodesMetadata,
        [nodeId]: { graphId: 'For_each', isRoot: true, parentNodeId: 'For_each' },
        For_each: { graphId: 'root', isRoot: false, actionCount: 1 },
      };
      state.operations.inputParameters['For_each'].parameterGroups.default.parameters[0].value = [
        {
          id: 'F3863BCC-869D-4E93-A4D8-BA2F95A3F114',
          type: 'token',
          token: {
            source: 'body',
            name: 'NestedArray',
            key: 'body.$.value.[*].NestedArray',
            tokenType: 'outputs',
            title: 'NestedArray',
            value: "triggerBody()?['NestedArray']",
          },
          value: "triggerBody()?['NestedArray']",
        },
      ];

      vi.spyOn(GraphHelper, 'getTriggerNodeId').mockReturnValue('manual');
      const details = await shouldAddForeach(nodeId, parameterId, token, state);

      expect(details).toBeDefined();
      expect(details.shouldAdd).toBeFalsy();
      expect(details.arrayDetails).toEqual([]);
      expect(details.repetitionContext).toEqual({
        repetitionReferences: [
          {
            actionName: 'For_each',
            actionType: 'foreach',
            repetitionValue: "@triggerBody()?['NestedArray']",
            repetitionPath: 'body.$.value.NestedArray',
          },
        ],
        splitOn: "@triggerBody()?['value']",
      });
    });

    test('should add only one implicit foreach for a node already in a loop when token in a nested array is added for splitOn disabled', async () => {
      const token = {
        key: 'body.$.value.[*].NestedArray.[*].P1',
        name: 'P1',
        type: 'string',
        brandColor: 'brandColor',
        title: 'P1',
        value: `item()?['P1']`,
        outputInfo: { arrayDetails: { parentArray: 'NestedArray' }, required: false, source: 'body', type: TokenType.OUTPUTS },
      };
      const state = clone(rootState);
      state.operations.settings['manual'].splitOn.value.enabled = false;
      state.operations.outputParameters['manual'].outputs['body.$.value.[*].NestedArray'].isInsideArray = true;
      state.workflow.nodesMetadata = {
        ...state.workflow.nodesMetadata,
        [nodeId]: { graphId: 'For_each', isRoot: true, parentNodeId: 'For_each' },
        For_each: { graphId: 'root', isRoot: false, actionCount: 1 },
      };
      state.operations.settings['manual'].splitOn.value.enabled = false;

      vi.spyOn(GraphHelper, 'getTriggerNodeId').mockReturnValue('manual');
      const details = await shouldAddForeach(nodeId, parameterId, token, state);

      expect(details).toBeDefined();
      expect(details.shouldAdd).toBeTruthy();
      expect(details.arrayDetails).toEqual([
        expect.objectContaining({ parentArrayKey: 'body.$.value.[*].NestedArray', parentArrayValue: "@items('For_each')?['NestedArray']" }),
      ]);
      expect(details.repetitionContext).toEqual({
        repetitionReferences: [
          {
            actionName: 'For_each',
            actionType: 'foreach',
            repetitionValue: "@triggerBody()?['value']",
            repetitionPath: 'body.$.value',
          },
        ],
        splitOn: undefined,
      });
    });
  });
});
