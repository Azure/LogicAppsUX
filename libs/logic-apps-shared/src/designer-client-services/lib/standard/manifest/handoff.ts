import type { OperationManifest } from '../../../../utils/src';
import { OutputSecureDataMode, SettingScope } from '../../../../utils/src';
import { coreBadge } from '../../badges';
import { handoffDataSvg } from '../../common/dataSvg/handoff';

export default {
  properties: {
    iconUri: handoffDataSvg,
    brandColor: '#3352b9',
    description: 'Handoff to another agent.',
    summary: 'Handoff',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          title: 'Agent Name',
          description: 'Agent Name',
        },
      },
    },
    isInputsOptional: false,

    outputs: {},
    isOutputsOptional: false,
    includeRootOutputs: true,

    connector: {
      id: '/connectionProviders/agent',
      name: 'Agent',
      properties: {
        description: 'Agent operations',
        displayName: 'Agent',
      },
    } as any,

    settings: {
      secureData: {
        options: {
          outputsMode: OutputSecureDataMode.LinkedToInputs,
        },
      },
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
