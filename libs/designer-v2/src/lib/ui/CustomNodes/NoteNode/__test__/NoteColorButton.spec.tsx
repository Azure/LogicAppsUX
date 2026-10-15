import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import ColorButton from '../NoteColorButton';

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: vi.fn(),
}));

describe('NoteColorButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReadOnly).mockReturnValue(false);
  });

  it('notifies the note when the portalled picker opens and closes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ColorButton id="note-1" selectedColor="#CCE5FF" onOpenChange={onOpenChange} />);

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button'));

    expect(onOpenChange).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ open: true }));
    const swatches = screen.getAllByRole('radio');
    expect(swatches).toHaveLength(6);
    expect(swatches[1]).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ open: false }));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('dispatches the selected color for the correct note without an open-change callback', async () => {
    const user = userEvent.setup();
    render(<ColorButton id="note-2" selectedColor="#FFFBCC" />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getAllByRole('radio')[1]);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'notes/updateNote',
      payload: { id: 'note-2', note: { color: '#CCE5FF' } },
    });
  });

  it('does not update a note in read-only mode', async () => {
    vi.mocked(useReadOnly).mockReturnValue(true);
    const user = userEvent.setup();
    render(<ColorButton id="read-only-note" selectedColor="#FFFBCC" />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getAllByRole('radio')[1]);

    expect(dispatch).not.toHaveBeenCalled();
  });
});
