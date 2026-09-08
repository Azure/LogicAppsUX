import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditableCodeView, type EditableCodeViewProps } from '../editableCodeView';

// MonacoEditor is heavy and pulls in the real monaco runtime; swap it for a textarea that
// forwards edits through the same onContentChanged contract.
vi.mock('../../editor/monaco', () => ({
  MonacoEditor: ({
    value,
    onContentChanged,
    readOnly,
  }: {
    value?: string;
    onContentChanged: (e: { value: string }) => void;
    readOnly?: boolean;
  }) => (
    <textarea
      data-testid="monaco-editor"
      aria-label="editable-code-view"
      readOnly={readOnly}
      value={value ?? ''}
      onChange={(e) => onContentChanged({ value: e.target.value })}
    />
  ),
}));

const labels = { save: 'Save', saving: 'Saving…', discard: 'Discard' };

const renderComponent = (overrides: Partial<EditableCodeViewProps> = {}) => {
  const props: EditableCodeViewProps = {
    value: '{}',
    onChange: vi.fn(),
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    labels,
    ...overrides,
  };
  return { props, ...render(<EditableCodeView {...props} />) };
};

describe('EditableCodeView', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('renders the editor with the supplied value', () => {
    renderComponent({ value: '{"a":1}' });
    expect(screen.getByTestId('monaco-editor')).toHaveValue('{"a":1}');
  });

  test('forwards editor edits through onChange', () => {
    const { props } = renderComponent();
    fireEvent.change(screen.getByTestId('monaco-editor'), { target: { value: '{"b":2}' } });
    expect(props.onChange).toHaveBeenCalledWith('{"b":2}');
  });

  test('disables Save and Discard when not dirty', () => {
    renderComponent({ isDirty: false });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
  });

  test('enables Save and Discard when dirty', () => {
    renderComponent({ isDirty: true });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled();
  });

  test('invokes onSave / onDiscard when the buttons are clicked', () => {
    const { props } = renderComponent({ isDirty: true });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onDiscard).toHaveBeenCalledTimes(1);
  });

  test('surfaces a validation error and keeps Save disabled even when dirty', () => {
    renderComponent({ isDirty: true, errorMessage: 'Invalid JSON' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Invalid JSON');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('shows a saving spinner and disables both buttons while saving', () => {
    renderComponent({ isDirty: true, isSaving: true });
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
  });

  test('renders a read-only editor and disabled actions when readOnly', () => {
    renderComponent({ isDirty: true, readOnly: true });
    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
  });
});
