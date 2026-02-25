import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import renderer from 'react-test-renderer';
import { WorkflowParametersPanel } from '../workflowParametersPanel';
import { useReadOnly, useLegacyWorkflowParameters } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useWorkflowParameters,
  useWorkflowParameterValidationErrors,
} from '../../../../core/state/workflowparameters/workflowparametersselector';
import { addParameter, updateParameter } from '../../../../core/state/workflowparameters/workflowparametersSlice';
import { deleteWorkflowParameter } from '../../../../core/actions/bjsworkflow/delete';
import type { PanelLocation } from '@microsoft/designer-ui';

// Mock selectors
vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: vi.fn(),
  useLegacyWorkflowParameters: vi.fn(),
}));

vi.mock('../../../../core/state/workflowparameters/workflowparametersselector', () => ({
  useWorkflowParameters: vi.fn(),
  useWorkflowParameterValidationErrors: vi.fn(),
}));

// Mock action creators
vi.mock('../../../../core/state/workflowparameters/workflowparametersSlice', () => ({
  addParameter: vi.fn(() => ({ type: 'workflowParameters/addParameter' })),
  updateParameter: vi.fn((payload: unknown) => ({ type: 'workflowParameters/updateParameter', payload })),
}));

vi.mock('../../../../core/actions/bjsworkflow/delete', () => ({
  deleteWorkflowParameter: vi.fn((id: string) => ({ type: 'deleteWorkflowParameter', payload: id })),
}));

// Mock dispatch
const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

// Capture props passed to WorkflowParameters
let capturedProps: Record<string, any> = {};
vi.mock('@microsoft/designer-ui', async () => {
  const actual = await vi.importActual<typeof import('@microsoft/designer-ui')>('@microsoft/designer-ui');
  return {
    ...actual,
    WorkflowParameters: (props: Record<string, any>) => {
      capturedProps = props;
      return <div data-testid="workflow-parameters" />;
    },
  };
});

const defaultProps = {
  isCollapsed: false,
  toggleCollapse: vi.fn(),
  panelLocation: 'RIGHT' as PanelLocation,
};

describe('WorkflowParametersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProps = {};
    (useReadOnly as Mock).mockReturnValue(false);
    (useLegacyWorkflowParameters as Mock).mockReturnValue(false);
    (useWorkflowParameters as Mock).mockReturnValue({});
    (useWorkflowParameterValidationErrors as Mock).mockReturnValue({});
  });

  it('should render without crashing', () => {
    const tree = renderer.create(<WorkflowParametersPanel {...defaultProps} />).toJSON();
    expect(tree).toBeDefined();
  });

  it('should pass readOnly and useLegacy props from selectors', () => {
    (useReadOnly as Mock).mockReturnValue(true);
    (useLegacyWorkflowParameters as Mock).mockReturnValue(true);

    renderer.create(<WorkflowParametersPanel {...defaultProps} />);

    expect(capturedProps.isReadOnly).toBe(true);
    expect(capturedProps.useLegacy).toBe(true);
  });

  it('should map workflow parameters record to array with id', () => {
    (useWorkflowParameters as Mock).mockReturnValue({
      'param-1': { name: 'myParam', type: 'String', defaultValue: 'hello' },
      'param-2': { name: 'otherParam', type: 'Int', defaultValue: '42' },
    });

    renderer.create(<WorkflowParametersPanel {...defaultProps} />);

    expect(capturedProps.parameters).toEqual([
      { id: 'param-1', name: 'myParam', type: 'String', defaultValue: 'hello' },
      { id: 'param-2', name: 'otherParam', type: 'Int', defaultValue: '42' },
    ]);
  });

  it('should pass an empty array when there are no parameters', () => {
    renderer.create(<WorkflowParametersPanel {...defaultProps} />);

    expect(capturedProps.parameters).toEqual([]);
  });

  it('should pass validation errors to WorkflowParameters', () => {
    const errors = { 'param-1': { name: 'Name is required' } };
    (useWorkflowParameterValidationErrors as Mock).mockReturnValue(errors);

    renderer.create(<WorkflowParametersPanel {...defaultProps} />);

    expect(capturedProps.validationErrors).toBe(errors);
  });

  it('should pass toggleCollapse as onDismiss', () => {
    renderer.create(<WorkflowParametersPanel {...defaultProps} />);

    expect(capturedProps.onDismiss).toBe(defaultProps.toggleCollapse);
  });

  it('should dispatch addParameter when onAddParameter is called', () => {
    renderer.create(<WorkflowParametersPanel {...defaultProps} />);

    capturedProps.onAddParameter();

    expect(addParameter).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'workflowParameters/addParameter' });
  });

  it('should dispatch deleteWorkflowParameter when onDeleteParameter is called', () => {
    renderer.create(<WorkflowParametersPanel {...defaultProps} />);

    capturedProps.onDeleteParameter({ id: 'param-1' });

    expect(deleteWorkflowParameter).toHaveBeenCalledWith('param-1');
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should dispatch updateParameter when onUpdateParameter is called', () => {
    const updateEvent = {
      id: 'param-1',
      newDefinition: { id: 'param-1', name: 'updated', type: 'String' },
      useLegacy: false,
    };

    renderer.create(<WorkflowParametersPanel {...defaultProps} />);

    capturedProps.onUpdateParameter(updateEvent);

    expect(updateParameter).toHaveBeenCalledWith(updateEvent);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'workflowParameters/updateParameter', payload: updateEvent });
  });
});
