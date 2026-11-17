import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NodeProps } from '@xyflow/react';
import PlaceholderNode from '../PlaceholderNode';

const controls = vi.hoisted(() => ({ readOnly: false, dispatch: vi.fn() }));
vi.mock('react-redux', () => ({ useDispatch: () => controls.dispatch }));
vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => controls.readOnly,
  useSharedNodeUi: () => true,
}));
vi.mock('../../../core/state/panel/panelSelectors', () => ({ useIsNodeSelectedInOperationPanel: () => false }));
vi.mock('../components/handles/DefaultHandle', () => ({ DefaultHandle: () => null }));
afterEach(() => {
  cleanup();
  controls.readOnly = false;
  controls.dispatch.mockClear();
});
const props = { id: 'actual-placeholder' } as NodeProps;

describe('canonical empty workflow host', () => {
  it.each(['Enter', ' '])('opens the actual trigger discovery exactly once with %s', (key) => {
    render(<PlaceholderNode {...props} />);
    fireEvent.keyDown(screen.getByRole('button'), { key });
    expect(controls.dispatch).toHaveBeenCalledTimes(1);
    expect(controls.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'panel/expandDiscoveryPanel',
        payload: expect.objectContaining({ addingTrigger: true, relationshipIds: { graphId: 'root' } }),
      })
    );
  });
  it('suppresses all discovery mutation paths in read-only mode', () => {
    controls.readOnly = true;
    render(<PlaceholderNode {...props} />);
    const card = screen.getByLabelText('Add a trigger to start your workflow');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(card).not.toHaveAttribute('tabindex');
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(controls.dispatch).not.toHaveBeenCalled();
  });
});
