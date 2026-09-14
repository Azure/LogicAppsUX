import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ParameterField } from '../parameterfield';
import * as parameterHelpers from '../../../../core/utils/parameters/helper';
import {
  createMcpHarness,
  createMcpState,
  createParameter,
  expressionMapping,
  reference,
} from '../../../../core/state/mcp/__test__/fixtures';

vi.mock('../ParameterEditor', () => ({
  ParameterEditor: ({ parameter, onParameterValueChange }: ComponentProps<typeof import('../ParameterEditor').ParameterEditor>) => (
    <div>
      <input
        aria-label="Parameter value"
        defaultValue={parameter.value[0]?.value}
        onChange={(event) => onParameterValueChange({ value: [{ id: 'edited', type: 'literal', value: event.target.value }] })}
      />
      <button
        type="button"
        onClick={() =>
          onParameterValueChange({
            value: [{ id: 'structured', type: 'literal', value: '{"name":"edited"}' }],
            viewModel: { items: [{ name: 'edited' }] },
          })
        }
      >
        Edit structured value
      </button>
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(parameterHelpers, 'updateParameterAndDependencies').mockImplementation(
    (payload) => ({ type: 'test/updateParameter', payload }) as any
  );
});
afterEach(cleanup);

const renderField = (overrides: Partial<ComponentProps<typeof ParameterField>> = {}, state = createMcpState()) => {
  const props: ComponentProps<typeof ParameterField> = {
    operationId: 'Query',
    groupId: 'default',
    parameter: createParameter({ preservedValue: 'old imported value' }),
    parameterInputType: 'user',
    parameterError: 'Value is required',
    onParameterVisibilityUpdate: vi.fn(),
    onParameterInputTypeChange: vi.fn(),
    handleRemoveConditionalParameter: vi.fn(),
    removeParameterError: vi.fn(),
    ...overrides,
  };
  const harness = createMcpHarness(state);
  return { ...render(<ParameterField {...props} />, harness), ...harness, props };
};
const selectInputType = (name: string) => {
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name }));
};

describe('MCP parameter field', () => {
  it.each(['concrete', 'expression', 'null', 'missing', 'dangling reference'] as const)(
    'dispatches user edits with only a concrete connection reference (%s)',
    (kind) => {
      const state = createMcpState();
      if (kind === 'missing') {
        delete state.connection.connectionsMapping.Query;
      } else {
        state.connection.connectionsMapping.Query =
          kind === 'expression' ? expressionMapping : kind === 'null' ? null : kind === 'concrete' ? 'Sql' : 'Unknown';
      }
      const { props, actions } = renderField({}, state);
      expect(screen.getByText('Value is required')).toBeInTheDocument();
      fireEvent.change(screen.getByRole('textbox', { name: 'Parameter value' }), { target: { value: 'new value' } });
      expect(actions).toEqual([
        {
          type: 'test/updateParameter',
          payload: {
            nodeId: 'Query',
            groupId: 'default',
            parameterId: 'body',
            properties: { value: [{ id: 'edited', type: 'literal', value: 'new value' }], preservedValue: undefined },
            isTrigger: false,
            operationInfo: state.operations.operationInfo.Query,
            connectionReference: kind === 'concrete' ? reference : undefined,
            nodeInputs: state.operations.inputParameters.Query,
            dependencies: state.operations.dependencies.Query,
            updateTokenMetadata: false,
            loadDynamicOutputs: false,
            loadDefaultValues: false,
          },
        },
      ]);
      expect(props.removeParameterError).toHaveBeenCalledExactlyOnceWith('body');
      expect(props.onParameterVisibilityUpdate).toHaveBeenCalledOnce();
    }
  );

  it('keeps required errors when a user clears the value, but drops preserved imported values', () => {
    const { props, actions } = renderField();
    fireEvent.change(screen.getByRole('textbox', { name: 'Parameter value' }), { target: { value: '' } });
    expect(props.removeParameterError).not.toHaveBeenCalled();
    expect(props.onParameterVisibilityUpdate).toHaveBeenCalledOnce();
    expect(actions[0]).toMatchObject({
      payload: { properties: { value: [{ value: '' }], preservedValue: undefined } },
    });
    expect((actions[0].payload as any).properties).not.toHaveProperty('editorViewModel');
  });

  it('updates editor view models when structured editors supply them', () => {
    const { actions, props } = renderField({ parameter: createParameter({ editor: 'dictionary' }) });
    fireEvent.click(screen.getByRole('button', { name: 'Edit structured value' }));
    expect(actions[0]).toMatchObject({
      payload: {
        properties: {
          editorViewModel: { items: [{ name: 'edited' }] },
          value: [{ value: '{"name":"edited"}' }],
          preservedValue: undefined,
        },
      },
    });
    expect(props.removeParameterError).toHaveBeenCalledWith('body');
  });

  it('switches model inputs to user inputs without resetting a value', () => {
    const { props, actions, rerender } = renderField({ parameterInputType: 'model', parameterError: undefined });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Provided value')).not.toBeInTheDocument();
    selectInputType('User');
    expect(props.onParameterInputTypeChange).toHaveBeenCalledWith('body', 'user');
    expect(actions).toEqual([]);
    rerender(<ParameterField {...props} parameterInputType="user" />);
    expect(screen.getByRole('textbox', { name: 'Parameter value' })).toHaveValue('original');
    expect(screen.getByText('Provided value')).toBeInTheDocument();
  });

  it.each(['concrete', 'expression', 'missing'] as const)(
    'switches to model, clears errors and values, and never promotes %s mappings',
    (kind) => {
      const state = createMcpState();
      if (kind === 'missing') {
        delete state.connection.connectionsMapping.Query;
      } else if (kind === 'expression') {
        state.connection.connectionsMapping.Query = expressionMapping;
      }
      const { props, actions, rerender } = renderField({}, state);
      selectInputType('Model');
      expect(props.onParameterInputTypeChange).toHaveBeenCalledWith('body', 'model');
      expect(props.removeParameterError).toHaveBeenCalledExactlyOnceWith('body');
      expect(props.onParameterVisibilityUpdate).toHaveBeenCalledOnce();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        type: 'test/updateParameter',
        payload: {
          connectionReference: kind === 'concrete' ? reference : undefined,
          properties: { value: [{ type: 'literal', value: '' }], preservedValue: undefined },
        },
      });
      rerender(<ParameterField {...props} parameterInputType="model" parameterError={undefined} />);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByText('Value is required')).not.toBeInTheDocument();
    }
  );

  it('prevents changing a locked input type', () => {
    const { props, actions } = renderField({ disableInputTypeChange: true });
    expect(screen.getByRole('combobox')).toBeDisabled();
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(props.onParameterInputTypeChange).not.toHaveBeenCalled();
    expect(actions).toEqual([]);
  });

  it('labels dynamic parameters and removes conditional parameters without changing their values', () => {
    const { props, actions } = renderField({
      parameter: createParameter({ info: { isDynamic: true } as any, placeholder: 'Pick a payload' }),
      isConditional: true,
    });
    expect(screen.getByText('Payload')).toBeInTheDocument();
    expect(screen.getByText('Dynamic parameter')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove parameter' }));
    expect(props.handleRemoveConditionalParameter).toHaveBeenCalledExactlyOnceWith('body');
    expect(actions).toEqual([]);
  });

  it.each(['array', 'dictionary', 'html', 'table', undefined])(
    'keeps %s user parameters editable without conditional controls',
    (editor) => {
      renderField({ parameter: createParameter({ editor }), parameterError: undefined });
      expect(screen.getByRole('textbox', { name: 'Parameter value' })).toBeInTheDocument();
      expect(screen.queryByText('Dynamic parameter')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove parameter' })).not.toBeInTheDocument();
    }
  );
});
