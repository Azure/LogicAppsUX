import { fireEvent, render, screen } from '@testing-library/react';
import { useDrag, useDrop } from 'react-dnd';
import KeyboardBackend, { isKeyboardDragTrigger } from 'react-dnd-accessible-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider, MouseTransition, createTransition } from 'react-dnd-multi-backend';
import { describe, expect, it, vi } from 'vitest';

function DragSource() {
  const [{ dragging }, drag] = useDrag(() => ({
    type: 'operation',
    item: { id: 'operation-1' },
    collect: (monitor) => ({ dragging: monitor.isDragging() }),
  }));
  return (
    <button
      type="button"
      ref={(node) => {
        drag(node);
      }}
      aria-pressed={dragging}
    >
      Operation
    </button>
  );
}

function DropTarget({ onDrop }: { onDrop: (item: { id: string }) => void }) {
  const [, drop] = useDrop(() => ({ accept: 'operation', drop: onDrop }), [onDrop]);
  return (
    <button
      type="button"
      ref={(node) => {
        drop(node);
      }}
    >
      Destination
    </button>
  );
}

function renderBackend(onDrop: (item: { id: string }) => void) {
  const keyboardTransition = createTransition('keydown', (event) => {
    if (!isKeyboardDragTrigger(event as KeyboardEvent)) {
      return false;
    }
    event.preventDefault();
    return true;
  });
  render(
    <DndProvider
      options={{
        backends: [
          { id: 'html5', backend: HTML5Backend, transition: MouseTransition },
          {
            id: 'keyboard',
            backend: KeyboardBackend,
            context: { window, document },
            preview: true,
            transition: keyboardTransition,
          },
        ],
      }}
    >
      <DragSource />
      <DropTarget onDrop={onDrop} />
    </DndProvider>
  );
}

describe('accessible backend with React DnD 16', () => {
  it('picks up, moves and drops an operation using the keyboard', () => {
    const onDrop = vi.fn();
    renderBackend(onDrop);
    const source = screen.getByRole('button', { name: 'Operation' });
    source.focus();
    fireEvent.keyDown(source, { key: 'd', ctrlKey: true });
    expect(source).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(source, { key: 'ArrowDown' });
    const target = screen.getByRole('button', { name: 'Destination' });
    expect(target).toHaveFocus();
    fireEvent.keyDown(target, { key: 'Enter' });
    expect(onDrop).toHaveBeenCalledWith({ id: 'operation-1' }, expect.anything());
    expect(source).toHaveAttribute('aria-pressed', 'false');
  });

  it('cancels keyboard dragging without dropping the operation', () => {
    const onDrop = vi.fn();
    renderBackend(onDrop);
    const source = screen.getByRole('button', { name: 'Operation' });
    source.focus();
    fireEvent.keyDown(source, { key: 'd', ctrlKey: true });
    expect(source).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(source, { key: 'Escape' });
    expect(onDrop).not.toHaveBeenCalled();
    expect(source).toHaveAttribute('aria-pressed', 'false');
    expect(source).toHaveFocus();
  });
});
