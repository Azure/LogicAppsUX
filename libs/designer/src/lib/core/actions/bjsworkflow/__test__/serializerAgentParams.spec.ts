import { describe, it, expect } from 'vitest';
import type { SerializedParameter } from '../serializer';
import { constructInputValues } from '../serializer';
import { getOperationInputParameters } from '../../../state/operation/operationSelector';
import type { NodeInputs } from '../../../state/operation/operationMetadataSlice';
import type { ParameterInfo } from '@microsoft/designer-ui';

/**
 * Regression tests to ensure agent deploymentModelProperties are correctly
 * included in serialization for all supported agent model types.
 *
 * Background: x-ms-input-dependencies visibility gates both the UI AND
 * serialization via shouldUseParameterInGroup() → getOperationInputParameters().
 * Narrowing visibility accidentally drops fields from the serialized workflow.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeParam = (overrides: Partial<ParameterInfo> & { parameterKey: string }): ParameterInfo =>
  ({
    id: overrides.parameterKey,
    parameterName: overrides.parameterName ?? overrides.parameterKey.split('.').pop(),
    parameterKey: overrides.parameterKey,
    label: overrides.label ?? overrides.parameterKey,
    required: false,
    type: 'string',
    value: [{ id: '1', type: 'literal', value: '' }],
    info: { format: '', isDynamic: false, ...overrides.info },
    ...overrides,
  }) as ParameterInfo;

/** Create a mock agentModelType parameter with a given value. */
const makeAgentModelTypeParam = (modelTypeValue: string): ParameterInfo =>
  makeParam({
    parameterKey: 'inputs.$.agentModelType',
    parameterName: 'agentModelType',
    value: [{ id: '1', type: 'literal', value: modelTypeValue }],
  });

/**
 * Create a deploymentModelProperties sub-field with visibility dependency
 * on agentModelType matching the given allowed values.
 */
const makeDeploymentModelPropParam = (propName: string, propValue: string, visibleFor: string[]): ParameterInfo =>
  makeParam({
    parameterKey: `inputs.$.agentModelSettings.deploymentModelProperties.${propName}`,
    parameterName: propName,
    value: [{ id: '1', type: 'literal', value: propValue }],
    info: {
      format: '',
      isDynamic: false,
      dependencies: {
        type: 'visibility',
        parameters: [{ name: 'agentModelType', values: visibleFor }],
      },
    },
  });

/** Build a NodeInputs with one default parameter group. */
const buildNodeInputs = (parameters: ParameterInfo[]): NodeInputs => ({
  parameterGroups: {
    default: {
      id: 'default',
      description: '',
      parameters,
      showAdvancedParameters: () => {},
    },
  },
  dynamicLoadStatus: undefined,
});

// ---------------------------------------------------------------------------
// getOperationInputParameters — visibility-based serialization filtering
// ---------------------------------------------------------------------------

describe('getOperationInputParameters – agent deploymentModelProperties visibility', () => {
  const visibleForBoth = ['AzureOpenAI', 'MicrosoftFoundry'];
  const visibleForFoundryOnly = ['MicrosoftFoundry'];

  it('includes deploymentModelProperties for AzureOpenAI when visibility includes AzureOpenAI', () => {
    const nodeInputs = buildNodeInputs([
      makeAgentModelTypeParam('AzureOpenAI'),
      makeDeploymentModelPropParam('name', 'gpt-4o', visibleForBoth),
      makeDeploymentModelPropParam('format', 'OpenAI', visibleForBoth),
      makeDeploymentModelPropParam('version', '2024-11-20', visibleForBoth),
    ]);

    const result = getOperationInputParameters(nodeInputs);
    const keys = result.map((p) => p.parameterKey);

    expect(keys).toContain('inputs.$.agentModelType');
    expect(keys).toContain('inputs.$.agentModelSettings.deploymentModelProperties.name');
    expect(keys).toContain('inputs.$.agentModelSettings.deploymentModelProperties.format');
    expect(keys).toContain('inputs.$.agentModelSettings.deploymentModelProperties.version');
  });

  it('includes deploymentModelProperties for MicrosoftFoundry when visibility includes MicrosoftFoundry', () => {
    const nodeInputs = buildNodeInputs([
      makeAgentModelTypeParam('MicrosoftFoundry'),
      makeDeploymentModelPropParam('name', 'gpt-4o', visibleForBoth),
      makeDeploymentModelPropParam('format', 'OpenAI', visibleForBoth),
      makeDeploymentModelPropParam('version', '2024-11-20', visibleForBoth),
    ]);

    const result = getOperationInputParameters(nodeInputs);
    const keys = result.map((p) => p.parameterKey);

    expect(keys).toContain('inputs.$.agentModelSettings.deploymentModelProperties.name');
    expect(keys).toContain('inputs.$.agentModelSettings.deploymentModelProperties.format');
    expect(keys).toContain('inputs.$.agentModelSettings.deploymentModelProperties.version');
  });

  it('EXCLUDES deploymentModelProperties for AzureOpenAI when visibility is MicrosoftFoundry-only (the bug)', () => {
    const nodeInputs = buildNodeInputs([
      makeAgentModelTypeParam('AzureOpenAI'),
      makeDeploymentModelPropParam('name', 'gpt-4o', visibleForFoundryOnly),
      makeDeploymentModelPropParam('format', 'OpenAI', visibleForFoundryOnly),
      makeDeploymentModelPropParam('version', '2024-11-20', visibleForFoundryOnly),
    ]);

    const result = getOperationInputParameters(nodeInputs);
    const keys = result.map((p) => p.parameterKey);

    // This demonstrates the bug: narrowing visibility drops fields from serialization
    expect(keys).not.toContain('inputs.$.agentModelSettings.deploymentModelProperties.name');
    expect(keys).not.toContain('inputs.$.agentModelSettings.deploymentModelProperties.format');
    expect(keys).not.toContain('inputs.$.agentModelSettings.deploymentModelProperties.version');
    // agentModelType itself has no visibility dependency, so it's always included
    expect(keys).toContain('inputs.$.agentModelType');
  });

  it('excludes parameters with serialization.skip flag regardless of visibility', () => {
    const skippedParam = makeParam({
      parameterKey: 'inputs.$.internalOnly',
      parameterName: 'internalOnly',
      info: { format: '', isDynamic: false, serialization: { skip: true } },
    });

    const nodeInputs = buildNodeInputs([makeAgentModelTypeParam('AzureOpenAI'), skippedParam]);

    const result = getOperationInputParameters(nodeInputs);
    const keys = result.map((p) => p.parameterKey);

    expect(keys).not.toContain('inputs.$.internalOnly');
  });

  it('includes parameters without any visibility dependencies', () => {
    const messagesParam = makeParam({
      parameterKey: 'inputs.$.messages',
      parameterName: 'messages',
      required: true,
      type: 'array',
    });

    const nodeInputs = buildNodeInputs([makeAgentModelTypeParam('AzureOpenAI'), messagesParam]);

    const result = getOperationInputParameters(nodeInputs);
    const keys = result.map((p) => p.parameterKey);

    expect(keys).toContain('inputs.$.messages');
  });

  it('handles empty parameterGroups gracefully', () => {
    const nodeInputs: NodeInputs = { parameterGroups: {}, dynamicLoadStatus: undefined };
    const result = getOperationInputParameters(nodeInputs);
    expect(result).toEqual([]);
  });

  it('handles null nodeInputs gracefully', () => {
    const result = getOperationInputParameters(null as unknown as NodeInputs);
    expect(result).toEqual([]);
  });

  it('excludes deploymentId for V1ChatCompletionsService when visibility only allows AzureOpenAI', () => {
    const deploymentId = makeParam({
      parameterKey: 'inputs.$.deploymentId',
      parameterName: 'deploymentId',
      value: [{ id: '1', type: 'literal', value: 'my-deployment' }],
      info: {
        format: '',
        isDynamic: false,
        dependencies: {
          type: 'visibility',
          parameters: [{ name: 'agentModelType', values: ['AzureOpenAI', 'MicrosoftFoundry'] }],
        },
      },
    });

    const nodeInputs = buildNodeInputs([makeAgentModelTypeParam('V1ChatCompletionsService'), deploymentId]);

    const result = getOperationInputParameters(nodeInputs);
    const keys = result.map((p) => p.parameterKey);

    expect(keys).not.toContain('inputs.$.deploymentId');
  });
});

// ---------------------------------------------------------------------------
// constructInputValues — agent deploymentModelProperties nested structure
// ---------------------------------------------------------------------------

describe('constructInputValues – agent deploymentModelProperties', () => {
  it('serializes deploymentModelProperties into nested agentModelSettings object', () => {
    const parameters: SerializedParameter[] = [
      {
        parameterKey: 'inputs.$.agentModelSettings.deploymentModelProperties.name',
        parameterName: 'name',
        id: 'deploymentModelProperties.name',
        info: { format: '', isDynamic: false },
        label: 'Model name',
        required: false,
        type: 'string',
        value: 'gpt-4o',
      },
      {
        parameterKey: 'inputs.$.agentModelSettings.deploymentModelProperties.format',
        parameterName: 'format',
        id: 'deploymentModelProperties.format',
        info: { format: '', isDynamic: false },
        label: 'Model format',
        required: false,
        type: 'string',
        value: 'OpenAI',
      },
      {
        parameterKey: 'inputs.$.agentModelSettings.deploymentModelProperties.version',
        parameterName: 'version',
        id: 'deploymentModelProperties.version',
        info: { format: '', isDynamic: false },
        label: 'Model version',
        required: false,
        type: 'string',
        value: '2024-11-20',
      },
    ] as SerializedParameter[];

    const result = constructInputValues('inputs.$', parameters, false);

    expect(result).toEqual({
      agentModelSettings: {
        deploymentModelProperties: {
          name: 'gpt-4o',
          format: 'OpenAI',
          version: '2024-11-20',
        },
      },
    });
  });

  it('serializes deploymentModelProperties alongside other agentModelSettings fields', () => {
    const parameters: SerializedParameter[] = [
      {
        parameterKey: 'inputs.$.agentModelType',
        parameterName: 'agentModelType',
        id: 'agentModelType',
        info: { format: '', isDynamic: false },
        label: 'Agent Model Type',
        required: true,
        type: 'string',
        value: 'AzureOpenAI',
      },
      {
        parameterKey: 'inputs.$.deploymentId',
        parameterName: 'deploymentId',
        id: 'deploymentId',
        info: { format: '', isDynamic: false },
        label: 'Deployment ID',
        required: false,
        type: 'string',
        value: 'my-gpt4o-deployment',
      },
      {
        parameterKey: 'inputs.$.agentModelSettings.deploymentModelProperties.name',
        parameterName: 'name',
        id: 'deploymentModelProperties.name',
        info: { format: '', isDynamic: false },
        label: 'Model name',
        required: false,
        type: 'string',
        value: 'gpt-4o',
      },
      {
        parameterKey: 'inputs.$.agentModelSettings.deploymentModelProperties.format',
        parameterName: 'format',
        id: 'deploymentModelProperties.format',
        info: { format: '', isDynamic: false },
        label: 'Model format',
        required: false,
        type: 'string',
        value: 'OpenAI',
      },
      {
        parameterKey: 'inputs.$.agentModelSettings.deploymentModelProperties.version',
        parameterName: 'version',
        id: 'deploymentModelProperties.version',
        info: { format: '', isDynamic: false },
        label: 'Model version',
        required: false,
        type: 'string',
        value: '2024-11-20',
      },
    ] as SerializedParameter[];

    const result = constructInputValues('inputs.$', parameters, false);

    expect(result).toEqual({
      agentModelType: 'AzureOpenAI',
      deploymentId: 'my-gpt4o-deployment',
      agentModelSettings: {
        deploymentModelProperties: {
          name: 'gpt-4o',
          format: 'OpenAI',
          version: '2024-11-20',
        },
      },
    });
  });

  it('produces empty agentModelSettings when deploymentModelProperties are excluded', () => {
    const parameters: SerializedParameter[] = [
      {
        parameterKey: 'inputs.$.agentModelType',
        parameterName: 'agentModelType',
        id: 'agentModelType',
        info: { format: '', isDynamic: false },
        label: 'Agent Model Type',
        required: true,
        type: 'string',
        value: 'AzureOpenAI',
      },
    ] as SerializedParameter[];

    const result = constructInputValues('inputs.$', parameters, false);

    // When no deploymentModelProperties params are present, the nested object is absent
    expect(result).toEqual({
      agentModelType: 'AzureOpenAI',
    });
    expect(result.agentModelSettings).toBeUndefined();
  });

  it('handles empty string values in deploymentModelProperties', () => {
    const parameters: SerializedParameter[] = [
      {
        parameterKey: 'inputs.$.agentModelSettings.deploymentModelProperties.name',
        parameterName: 'name',
        id: 'deploymentModelProperties.name',
        info: { format: '', isDynamic: false },
        label: 'Model name',
        required: false,
        type: 'string',
        value: '',
      },
      {
        parameterKey: 'inputs.$.agentModelSettings.deploymentModelProperties.format',
        parameterName: 'format',
        id: 'deploymentModelProperties.format',
        info: { format: '', isDynamic: false },
        label: 'Model format',
        required: false,
        type: 'string',
        value: '',
      },
      {
        parameterKey: 'inputs.$.agentModelSettings.deploymentModelProperties.version',
        parameterName: 'version',
        id: 'deploymentModelProperties.version',
        info: { format: '', isDynamic: false },
        label: 'Model version',
        required: false,
        type: 'string',
        value: '',
      },
    ] as SerializedParameter[];

    const result = constructInputValues('inputs.$', parameters, false);

    // Even with empty values, the nested structure is preserved in serialization
    expect(result).toEqual({
      agentModelSettings: {
        deploymentModelProperties: {
          name: '',
          format: '',
          version: '',
        },
      },
    });
  });
});
