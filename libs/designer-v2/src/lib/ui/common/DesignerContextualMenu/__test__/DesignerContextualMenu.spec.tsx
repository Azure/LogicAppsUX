import React from 'react';
import renderer from 'react-test-renderer';
import { describe, vi, beforeEach, it, expect } from 'vitest';
import { DesignerContextualMenu } from '../DesignerContextualMenu';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import * as designerViewSelectors from '../../../../core/state/designerView/designerViewSelectors';
import * as panelSelectors from '../../../../core/state/panel/panelSelectors';
import * as workflowSelectors from '../../../../core/state/workflow/workflowSelectors';
import * as designerOptionsSelectors from '../../../../core/state/designerOptions/designerOptionsSelectors';
import * as operationInfoHook from '../../../../core/state/selectors/actionMetadataSelector';

// Mock react-redux
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector: any) => selector({ workflow: { operations: {} } }),
}));

// Mock @xyflow/react
vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    screenToFlowPosition: vi.fn(() => ({ x: 0, y: 0 })),
  }),
}));

// Mock react-intl
vi.mock('react-intl', async () => {
  const actualIntl = await vi.importActual('react-intl');
  return {
    ...actualIntl,
    useIntl: () => ({
      formatMessage: vi.fn(({ defaultMessage }) => defaultMessage),
    }),
  };
});

// Mock @microsoft/designer-ui
vi.mock('@microsoft/designer-ui', async () => {
  const actual = await vi.importActual('@microsoft/designer-ui');
  return {
    ...actual,
    CardContextMenu: ({ menuItems, title }: { menuItems: JSX.Element[]; title: string }) => (
      <div data-testid="card-context-menu" data-title={title}>
        {menuItems}
      </div>
    ),
  };
});

// Mock logic-apps-shared
vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual('@microsoft/logic-apps-shared');
  return {
    ...actual,
    getRecordEntry: vi.fn(() => ({})),
    isScopeOperation: vi.fn(() => false),
    isUiInteractionsServiceEnabled: vi.fn(() => false),
    WorkflowService: vi.fn(() => ({})),
  };
});

// Mock menu items
vi.mock('../../../../ui/menuItems', () => ({
  DeleteMenuItem: ({ onClick, showKey }: { onClick: () => void; showKey?: boolean }) => (
    <div data-testid="delete-menu-item" data-show-key={showKey} onClick={onClick}>
      Delete
    </div>
  ),
  CopyMenuItem: () => <div data-testid="copy-menu-item">Copy</div>,
  ResubmitMenuItem: () => <div data-testid="resubmit-menu-item">Resubmit</div>,
  ExpandCollapseMenuItem: ({ nodeId }: { nodeId: string }) => (
    <div data-testid="expand-collapse-menu-item" data-node-id={nodeId}>
      Expand/Collapse
    </div>
  ),
  CollapseMenuItem: () => <div data-testid="collapse-menu-item">Collapse</div>,
}));

vi.mock('../../../../ui/menuItems/pinMenuItem', () => ({
  PinMenuItem: () => <div data-testid="pin-menu-item">Pin</div>,
}));

vi.mock('../../../../ui/menuItems/runAfterMenuItem', () => ({
  RunAfterMenuItem: () => <div data-testid="run-after-menu-item">Run After</div>,
}));

vi.mock('../../../../ui/menuItems/addNoteMenuItem', () => ({
  AddNoteMenuItem: () => <div data-testid="add-note-menu-item">Add Note</div>,
}));

describe('DesignerContextualMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.spyOn(designerViewSelectors, 'useNodeContextMenuData').mockReturnValue({
      nodeId: 'test-node',
      location: { x: 100, y: 100 },
    });
    vi.spyOn(workflowSelectors, 'useIsActionCollapsed').mockReturnValue(false);
    vi.spyOn(workflowSelectors, 'useNodeDisplayName').mockReturnValue('Test Node');
    vi.spyOn(workflowSelectors, 'useNodeMetadata').mockReturnValue({});
    vi.spyOn(workflowSelectors, 'useRunData').mockReturnValue({});
    vi.spyOn(workflowSelectors, 'useRunInstance').mockReturnValue(undefined);
    vi.spyOn(workflowSelectors, 'useRunMode').mockReturnValue('Draft');
    vi.spyOn(workflowSelectors, 'useIsAgentLoop').mockReturnValue(false);
    vi.spyOn(panelSelectors, 'useOperationAlternateSelectedNodeId').mockReturnValue('');
    vi.spyOn(designerOptionsSelectors, 'useSuppressDefaultNodeSelectFunctionality').mockReturnValue(false);
    vi.spyOn(designerOptionsSelectors, 'useNodeSelectAdditionalCallback').mockReturnValue(undefined);
    vi.spyOn(operationInfoHook, 'useOperationInfo').mockReturnValue({ type: 'action' } as any);
  });

  it('should show delete menu item for MCP_CLIENT subgraph type', () => {
    vi.spyOn(workflowSelectors, 'useNodeMetadata').mockReturnValue({
      subgraphType: SUBGRAPH_TYPES.MCP_CLIENT,
    } as any);

    const tree = renderer.create(<DesignerContextualMenu />);
    const testInstance = tree.root;

    const deleteItem = testInstance.findByProps({ 'data-testid': 'delete-menu-item' });
    expect(deleteItem).toBeDefined();
  });
});
