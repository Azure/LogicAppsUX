import type { CommonPanelProps, PanelContainerProps } from '@microsoft/designer-ui';
import { PanelContainer, PanelLocation } from '@microsoft/designer-ui';
import { cleanup, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeDetailsPanel } from '../nodeDetailsPanel';
import { usePanelNodeData } from '../usePanelNodeData';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  isTrigger: false,
  state: {
    workflow: {
      operations: { Action: { type: 'Http' } },
      nodesMetadata: {},
      idReplacements: {},
    },
    operations: {
      operationInfo: {} as Record<string, { type: string } | undefined>,
      inputParameters: {},
    },
  },
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
}));
vi.mock('../../../../core', () => ({
  clearPanel: vi.fn(),
  collapsePanel: vi.fn(),
  updateParameterValidation: vi.fn(),
  validateParameter: vi.fn(),
}));
vi.mock('../../../../core/utils/parameters/helper', () => ({
  shouldEncodeParameterValueForOperationBasedOnMetadata: vi.fn(),
}));
vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => false,
  useSuppressDefaultNodeSelectFunctionality: () => false,
}));
vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useIsA2AWorkflow: () => false,
}));
vi.mock('../../../../core/state/designerView/designerViewSlice', () => ({
  setShowDeleteModalNodeId: vi.fn(),
}));
vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useIsPanelCollapsed: () => false,
  useOperationAlternateSelectedNode: () => undefined,
  useOperationPanelSelectedNodeId: () => 'Action',
}));
vi.mock('../../../../core/state/panel/panelSlice', () => ({
  setAlternateSelectedNode: vi.fn(),
  updatePanelLocation: (payload: string) => ({ type: 'updatePanelLocation', payload }),
}));
vi.mock('../../../../core/state/undoRedo/undoRedoSelectors', () => ({
  useUndoRedoClickToggle: () => false,
}));
vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: () => ({ type: 'Http' }),
  useRunData: () => undefined,
  useRunInstance: () => undefined,
}));
vi.mock('../../../../core/state/workflow/workflowSlice', () => ({
  replaceId: vi.fn(),
  setNodeDescription: vi.fn(),
}));
vi.mock('../../../../core/utils/graph', () => ({
  isTriggerNode: () => mocks.isTrigger,
  isOperationNameValid: vi.fn(),
}));
vi.mock('../usePanelNodeData', () => ({ usePanelNodeData: vi.fn() }));
vi.mock('@microsoft/designer-ui', () => ({
  PanelScope: { CardLevel: 'CARD_LEVEL' },
  PanelLocation: { Right: 'RIGHT' },
  PanelContainer: vi.fn((props: PanelContainerProps) => <div data-testid="selected-menu">{props.nodeHeaderItems}</div>),
}));
vi.mock('../../../menuItems/commentMenuItem', () => ({ CommentMenuItem: () => null }));
vi.mock('../../../menuItems/pinMenuItem', () => ({ PinMenuItem: () => null }));
vi.mock('../../../menuItems/deleteMenuItem', () => ({ DeleteMenuItem: () => <button type="button">Delete</button> }));

const props: CommonPanelProps = {
  isCollapsed: false,
  toggleCollapse: vi.fn(),
  panelLocation: PanelLocation.Right,
  isResizeable: true,
};

const panelProps = (): PanelContainerProps => {
  const latest = vi.mocked(PanelContainer).mock.calls.at(-1)?.[0];
  if (!latest) {
    throw new Error('PanelContainer was not rendered');
  }
  return latest;
};

describe('NodeDetailsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrigger = false;
    mocks.state.operations.operationInfo = {};
    vi.mocked(usePanelNodeData).mockImplementation((nodeId) =>
      nodeId
        ? {
            nodeId,
            displayName: nodeId,
            iconUri: '',
            isError: false,
            isLoading: false,
            tabs: [],
            onSelectTab: vi.fn(),
            comment: undefined,
            errorMessage: undefined,
            runData: undefined,
            selectedTab: undefined,
            subgraphType: undefined,
          }
        : undefined
    );
  });

  afterEach(cleanup);

  it.each([false, true])('opens before operation info loads and updates when it arrives (isTrigger=%s)', (isTrigger) => {
    mocks.isTrigger = isTrigger;
    const renderPanel = () => (
      <IntlProvider locale="en">
        <NodeDetailsPanel {...props} />
      </IntlProvider>
    );
    const { rerender } = render(renderPanel());

    expect(panelProps()).toMatchObject({ node: { nodeId: 'Action' }, isTrigger, showTriggerInfo: false });
    expect(within(screen.getByTestId('selected-menu')).getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(panelProps().nodeHeaderItems.find((item) => item.key === 'delete')?.props.operationType).toBeUndefined();

    const operationType = isTrigger ? 'Request' : 'Http';
    mocks.state.operations.operationInfo = { Action: { type: operationType } };
    rerender(renderPanel());

    expect(panelProps().showTriggerInfo).toBe(isTrigger);
    expect(panelProps().nodeHeaderItems.find((item) => item.key === 'delete')?.props.operationType).toBe(operationType);
  });
});
