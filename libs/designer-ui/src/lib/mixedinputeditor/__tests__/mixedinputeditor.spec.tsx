import { render } from '@testing-library/react';
import { MixedInputEditor } from '../mixedinputeditor';
import { LOCAL_STORAGE_KEYS, type ValueSegment } from '@microsoft/logic-apps-shared';
import { describe, vi, beforeEach, it, expect } from 'vitest';
describe('MixedInputEditor', () => {
  let initialValue: ValueSegment[];
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    initialValue = [
      {
        id: '1',
        type: 'literal',
        value: JSON.stringify({
          type: 'object',
          properties: {
            test: { type: 'string' },
          },
          useSchemaEditor: true,
        }),
      },
    ];

    mockOnChange = vi.fn();
    localStorage.clear();
  });

  it('should render the toggle and the SchemaEditor when useSchemaEditor is true', () => {
    const { getByLabelText, getByText } = render(
      <MixedInputEditor
        initialValue={initialValue}
        onChange={mockOnChange}
        useStaticInputs={false}
        supportedTypes={['string', 'number', 'boolean']} // Add supportedTypes prop
      />
    );

    const toggle = getByLabelText('Use Schema Editor') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it('should read the toggle state from local storage', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.MIXED_INPUT_TOGGLE, 'true');

    const { getByLabelText } = render(
      <MixedInputEditor
        initialValue={initialValue}
        onChange={mockOnChange}
        useStaticInputs={false}
        supportedTypes={['string', 'number', 'boolean']}
      />
    );

    const toggle = getByLabelText('Use Schema Editor') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  // it('should update local storage when the toggle is changed', () => {
  //   const { getByLabelText } = render(
  //     <MixedInputEditor
  //       initialValue={initialValue}
  //       onChange={mockOnChange}
  //       useStaticInputs={false}
  //       supportedTypes={['string', 'number', 'boolean']}
  //     />
  //   );

  //   const toggle = getByLabelText('Use Schema Editor');
  //   fireEvent.click(toggle);

  //   expect(localStorage.getItem('mixedInputEditor_toggle')).toBe('false');
  // });

  // it('should set local storage to true when toggled on', () => {
  //   const initialValueWithoutSchemaEditor = initialValue.map((segment) => ({
  //     ...segment,
  //     value: JSON.stringify({
  //       ...JSON.parse(segment.value),
  //       useSchemaEditor: false,
  //     }),
  //   }));

  //   const { getByLabelText } = render(
  //     <MixedInputEditor
  //       initialValue={initialValueWithoutSchemaEditor}
  //       onChange={mockOnChange}
  //       useStaticInputs={false}
  //       supportedTypes={['string', 'number', 'boolean']}
  //     />
  //   );

  //   const toggle = getByLabelText('Use Schema Editor');
  //   fireEvent.click(toggle);

  //   expect(localStorage.getItem('mixedInputEditor_toggle')).toBe('true');
  // });

  // it('should set local storage to false when toggled off', () => {
  //   const { getByLabelText } = render(
  //     <MixedInputEditor
  //       initialValue={initialValue}
  //       onChange={mockOnChange}
  //       useStaticInputs={false}
  //       supportedTypes={['string', 'number', 'boolean']}
  //     />
  //   );

  //   const toggle = getByLabelText('Use Schema Editor');
  //   fireEvent.click(toggle);

  //   expect(localStorage.getItem('mixedInputEditor_toggle')).toBe('false');
  // });

  it('should include useSchemaEditor in initial value', () => {
    const initialValue: ValueSegment[] = [
      {
        id: '1',
        type: 'literal', // Ensure this matches the expected union type
        value: JSON.stringify({
          type: 'object',
          properties: {
            test: { type: 'string' },
          },
          useSchemaEditor: true,
        }),
      },
    ];

    const { container } = render(
      <MixedInputEditor
        initialValue={initialValue}
        onChange={mockOnChange}
        useStaticInputs={false}
        supportedTypes={['string', 'number', 'boolean']} // Add supportedTypes prop
      />
    );

    const schemaEditorContainer = container.querySelector('.msla-schema-editor-body');
    expect(schemaEditorContainer).toBeTruthy();
  });
});
