// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const api = (version: string) => ({
    useIsDesignerDirty: vi.fn(() => false),
    useCanUndo: vi.fn(() => true),
    useCanRedo: vi.fn(() => true),
    useTotalNumErrors: vi.fn(() => 0),
    serializeWorkflow: vi.fn(async () => ({ version })),
    resetDesignerDirtyState: vi.fn(() => ({ type: `${version}/reset` })),
    openPanel: vi.fn((payload) => ({ type: `${version}/panel`, payload })),
    onUndoClick: vi.fn(() => ({ type: `${version}/undo` })),
    onRedoClick: vi.fn(() => ({ type: `${version}/redo` })),
  });
  return { v1: api('v1'), v2: api('v2'), dispatch: vi.fn(), state: { designerOptions: { isDarkMode: false } } };
});

vi.mock('@microsoft/logic-apps-designer', () => mocks.v1);
vi.mock('@microsoft/logic-apps-designer-v2', () => mocks.v2);
vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
}));
vi.mock('@fluentui/react', () => ({
  ActionButton: ({ text, onClick, disabled }: { text: string; onClick: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {text}
    </button>
  ),
  Modal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => (isOpen ? <div>{children}</div> : null),
}));
vi.mock('@microsoft/designer-ui', () => ({
  MonacoEditor: ({ value }: { value: string }) => <pre data-testid="serialized-workflow">{value}</pre>,
}));
vi.mock('@microsoft/logic-apps-shared', () => ({
  EditorLanguage: { json: 'json' },
  RUN_AFTER_COLORS: { light: { FAILED: 'red' }, dark: { FAILED: 'red' } },
}));

import { PseudoCommandBar, PseudoCommandBarV2 } from '../pseudoCommandBar';

describe('local designer commandbar versions', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it.each([
    ['v1', PseudoCommandBar, mocks.v1, mocks.v2],
    ['v2', PseudoCommandBarV2, mocks.v2, mocks.v1],
  ] as const)('uses %s history actions and serializer exclusively', async (version, Component, selected, other) => {
    render(<Component />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(mocks.dispatch).toHaveBeenNthCalledWith(1, { type: `${version}/undo` });
    expect(mocks.dispatch).toHaveBeenNthCalledWith(2, { type: `${version}/redo` });
    expect(other.onUndoClick).not.toHaveBeenCalled();
    expect(other.onRedoClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Code View' }));
    await waitFor(() => expect(screen.getByTestId('serialized-workflow').textContent).toContain(version));
    expect(selected.serializeWorkflow).toHaveBeenCalledExactlyOnceWith(mocks.state);
    expect(other.serializeWorkflow).not.toHaveBeenCalled();
  });
});
