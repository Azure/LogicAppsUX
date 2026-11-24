import { cleanup, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteMenuItem } from '../../../menuItems/deleteMenuItem';
import DeleteModal from '../DeleteModal';
import MultiSelectDeleteModal from '../MultiSelectDeleteModal';

const state = vi.hoisted(() => ({ monitoring: false, pendingNode: 'Compose' as string | undefined, bulkOpen: true, dispatch: vi.fn() }));

vi.mock('react-redux', () => ({ useDispatch: () => state.dispatch }));
vi.mock('../../../../core', () => ({
  useNodeDisplayName: (id?: string) => id ?? '',
  useNodeMetadata: () => ({ graphId: 'root' }),
  storeStateToUndoRedoHistory: vi.fn(),
}));
vi.mock('../../../../core/actions/bjsworkflow/delete', () => ({
  deleteOperation: vi.fn(),
  deleteGraphNode: vi.fn(),
  deleteOperations: vi.fn(),
}));
vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => false,
  useMonitoringView: () => state.monitoring,
}));
vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useShowDeleteModalNodeId: () => state.pendingNode,
  useShowMultiSelectDeleteModal: () => state.bulkOpen,
}));
vi.mock('../../../../core/state/designerView/designerViewSlice', () => ({
  setShowDeleteModalNodeId: (nodeId?: string) => ({ type: 'view/deleteNode', payload: nodeId }),
  setShowMultiSelectDeleteModal: (open: boolean) => ({ type: 'view/bulkDelete', payload: open }),
}));
vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useWorkflowNode: () => ({ type: 'operation' }),
  useActionMetadata: () => ({ type: 'Compose' }),
  useNodeDisplayName: (id: string) => id,
}));
vi.mock('../../../../core/state/operation/operationSelector', () => ({ useOperationVisuals: () => ({}) }));
vi.mock('../../../../core/state/panel/panelSelectors', () => ({ useOperationPanelSelectedNodeIds: () => ['Compose', 'Response'] }));
vi.mock('@microsoft/designer-ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@microsoft/designer-ui')>()),
  DeleteNodeModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog" aria-label="Delete Compose" /> : null),
}));

describe('monitoring deletion', () => {
  beforeEach(() => {
    state.monitoring = false;
    state.pendingNode = 'Compose';
    state.bulkOpen = true;
    state.dispatch.mockClear();
  });
  afterEach(cleanup);

  it.each([
    { Dialog: DeleteModal, name: 'Delete Compose', close: { type: 'view/deleteNode', payload: undefined } },
    { Dialog: MultiSelectDeleteModal, name: 'Delete workflow actions', close: { type: 'view/bulkDelete', payload: false } },
  ])('dismisses the pending "$name" confirmation when monitoring begins', ({ Dialog, name, close }) => {
    const confirmation = (
      <IntlProvider locale="en">
        <Dialog />
      </IntlProvider>
    );
    const { rerender } = render(confirmation);
    expect(screen.getByRole('dialog', { name })).toBeVisible();

    state.monitoring = true;
    rerender(
      <IntlProvider locale="en">
        <Dialog />
      </IntlProvider>
    );
    expect(screen.queryByRole('dialog', { name })).toBeNull();
    expect(state.dispatch.mock.calls).toEqual([[close]]);
  });

  it('disables the node Delete menu item even when the host sets only monitoring', () => {
    state.monitoring = true;
    render(
      <IntlProvider locale="en">
        <DeleteMenuItem onClick={vi.fn()} />
      </IntlProvider>
    );
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute('aria-disabled', 'true');
  });
});
