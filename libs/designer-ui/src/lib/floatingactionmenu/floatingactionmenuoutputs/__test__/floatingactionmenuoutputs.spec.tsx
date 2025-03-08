import React from 'react';
import { FloatingActionMenuOutputs, type FloatingActionMenuOutputsProps, type FloatingActionMenuOutputViewModel } from '..';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { TokenPickerMode } from '../../../tokenpicker';
import { ValueSegment } from '@microsoft/logic-apps-shared';
import { ChangeState } from '../../../editor/base';

describe('ui/floatingactionmenuoutputs', () => {
  let minimal: FloatingActionMenuOutputsProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      supportedTypes: ['text', 'file', 'email', 'boolean', 'number', 'date'],
      initialValue: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          type: 'literal',
          value: '{"type": "object", "properties": {}}',
        },
      ],
      onChange: () => {},
      editorViewModel: {
        schema: {
          type: 'object',
          properties: {
            text: {
              title: 'Text',
              description: 'Enter a description of the output',
              type: 'string',
              'x-ms-content-hint': 'TEXT',
              'x-ms-dynamically-added': true,
            },
          },
        },
        outputValueSegmentsMap: {
          text: [
            {
              id: '00000000-0000-0000-0000-000000000000',
              type: 'literal',
              value: 'response',
            },
          ],
        },
      },
      basePlugins: {
        tokens: true,
      },
      tokenPickerButtonProps: {
        location: 'right',
      },
      getTokenPicker: (
        _editorId: string,
        _labelId: string,
        _tokenPickerMode?: TokenPickerMode,
        _valueType?: string,
        _tokenClickedCallback?: (token: ValueSegment) => void
      ) => <></>,
      hideValidationErrors: (_newState: ChangeState) => {},
      includeOutputDescription: true,
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<FloatingActionMenuOutputs {...minimal} />);
    const output = renderer.getRenderOutput();
    expect(output).toBeDefined();
  });

  it('should throw expected validation exception if editorViewModel?.schema?.properties is undefined', () => {
    const minimalWithUndefinedSchemaProperties = {
      ...minimal,
      editorViewModel: {
        schema: {
          type: 'object',
          properties: undefined,
        },
      } as unknown as FloatingActionMenuOutputViewModel,
    };

    try {
      renderer.render(<FloatingActionMenuOutputs {...minimalWithUndefinedSchemaProperties} />);
      expect(false).toBe(true);
    } catch (e) {
      expect(e.code).toBe('InvalidParameters');
      expect(e.message).toBe('default value needed for floatingActionMenuOutputs.');
    }
  });

  it('should call on change with expected object if title changes', () => {
    const onChange = vi.fn();
    const { getByPlaceholderText } = render(<FloatingActionMenuOutputs {...minimal} onChange={onChange} />);
    const newText = 'New text';
    fireEvent.change(getByPlaceholderText('Enter a name'), { target: { value: newText } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(getByPlaceholderText('Enter a name'));
    const expectedOnChange = {
      value: minimal.initialValue,
      viewModel: {
        schema: {
          type: 'object',
          properties: {
            text: {
              title: 'New text',
              description: 'Enter a description of the output',
              type: 'string',
              'x-ms-content-hint': 'TEXT',
              'x-ms-dynamically-added': true,
            },
          },
        },
        outputValueSegmentsMap: {
          text: [
            {
              id: '00000000-0000-0000-0000-000000000000',
              type: 'literal',
              value: 'response',
            },
          ],
        },
      },
    };
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining(expectedOnChange));
  });

  it('should call on change with expected object if description changes', () => {
    const onChange = vi.fn();
    const { getByPlaceholderText } = render(<FloatingActionMenuOutputs {...minimal} onChange={onChange} />);
    const newText = 'New text';
    fireEvent.change(getByPlaceholderText('Enter a description of the output'), { target: { value: newText } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(getByPlaceholderText('Enter a description of the output'));
    const expectedOnChange = {
      value: minimal.initialValue,
      viewModel: {
        schema: {
          type: 'object',
          properties: {
            text: {
              title: 'Text',
              description: 'New text',
              type: 'string',
              'x-ms-content-hint': 'TEXT',
              'x-ms-dynamically-added': true,
            },
          },
        },
        outputValueSegmentsMap: {
          text: [
            {
              id: '00000000-0000-0000-0000-000000000000',
              type: 'literal',
              value: 'response',
            },
          ],
        },
      },
    };
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining(expectedOnChange));
  });

  it('should call on change with expected object if parameter deleted changes', async () => {
    const onChange = vi.fn();
    const { getByTitle, findByText } = render(<FloatingActionMenuOutputs {...minimal} onChange={onChange} />);
    fireEvent.click(getByTitle('Menu'));
    const deleteButton = await findByText('Delete');
    fireEvent.click(deleteButton);
    const expectedOnChange = {
      value: minimal.initialValue,
      viewModel: {
        schema: {
          type: 'object',
          properties: {},
        },
        outputValueSegmentsMap: {},
      },
    };
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining(expectedOnChange));
  });

  it('should call on change with expected object if text menu item selected', async () => {
    const initialEditorViewModel = {
      schema: {
        type: 'object',
        properties: {},
      },
      outputValueSegmentsMap: {},
    };
    const onChange = vi.fn();
    const { getByText, findByRole } = render(
      <FloatingActionMenuOutputs {...minimal} editorViewModel={initialEditorViewModel} onChange={onChange} />
    );
    fireEvent.click(getByText('Add an output'));
    const booleanMenuItem = await findByRole('button', { name: 'Yes/No' });
    fireEvent.click(booleanMenuItem);
    const expectedOnChange = {
      value: minimal.initialValue,
      viewModel: {
        schema: {
          type: 'object',
          properties: {
            boolean: {
              title: '',
              description: '',
              format: undefined,
              type: 'boolean',
              'x-ms-content-hint': 'BOOLEAN',
              'x-ms-dynamically-added': true,
            },
          },
        },
        outputValueSegmentsMap: {},
      },
    };
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining(expectedOnChange));
  });

  it('should call on change with expected object if boolean menu item selected', async () => {
    const initialEditorViewModel = {
      schema: {
        type: 'object',
        properties: {},
      },
      outputValueSegmentsMap: {},
    };
    const onChange = vi.fn();
    const { getByText, findByRole } = render(
      <FloatingActionMenuOutputs {...minimal} editorViewModel={initialEditorViewModel} onChange={onChange} />
    );
    fireEvent.click(getByText('Add an output'));
    const booleanMenuItem = await findByRole('button', { name: 'Yes/No' });
    fireEvent.click(booleanMenuItem);
    const expectedOnChange = {
      value: minimal.initialValue,
      viewModel: {
        schema: {
          type: 'object',
          properties: {
            boolean: {
              title: '',
              description: '',
              type: 'boolean',
              'x-ms-content-hint': 'BOOLEAN',
              'x-ms-dynamically-added': true,
            },
          },
        },
        outputValueSegmentsMap: {},
      },
    };
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining(expectedOnChange));
  });

  it('should call on change with expected object if number menu item selected', async () => {
    const initialEditorViewModel = {
      schema: {
        type: 'object',
        properties: {},
      },
      outputValueSegmentsMap: {},
    };
    const onChange = vi.fn();
    const { getByText, findByRole } = render(
      <FloatingActionMenuOutputs {...minimal} editorViewModel={initialEditorViewModel} onChange={onChange} />
    );
    fireEvent.click(getByText('Add an output'));
    const numberMenuItem = await findByRole('button', { name: 'Number' });
    fireEvent.click(numberMenuItem);
    const expectedOnChange = {
      value: minimal.initialValue,
      viewModel: {
        schema: {
          type: 'object',
          properties: {
            number: {
              title: '',
              description: '',
              type: 'number',
              'x-ms-content-hint': 'NUMBER',
              'x-ms-dynamically-added': true,
            },
          },
        },
        outputValueSegmentsMap: {},
      },
    };
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining(expectedOnChange));
  });

  it('should call on change with expected object if date menu item selected', async () => {
    const initialEditorViewModel = {
      schema: {
        type: 'object',
        properties: {},
      },
      outputValueSegmentsMap: {},
    };
    const onChange = vi.fn();
    const { getByText, findByRole } = render(
      <FloatingActionMenuOutputs {...minimal} editorViewModel={initialEditorViewModel} onChange={onChange} />
    );
    fireEvent.click(getByText('Add an output'));
    const dateMenuItem = await findByRole('button', { name: 'Date' });
    fireEvent.click(dateMenuItem);
    const expectedOnChange = {
      value: minimal.initialValue,
      viewModel: {
        schema: {
          type: 'object',
          properties: {
            date: {
              title: '',
              description: '',
              type: 'string',
              format: 'date',
              'x-ms-content-hint': 'DATE',
              'x-ms-dynamically-added': true,
            },
          },
        },
        outputValueSegmentsMap: {},
      },
    };
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining(expectedOnChange));
  });

  it('should call on change with expected object if email menu item selected', async () => {
    const initialEditorViewModel = {
      schema: {
        type: 'object',
        properties: {},
      },
      outputValueSegmentsMap: {},
    };
    const onChange = vi.fn();
    const { getByText, findByRole } = render(
      <FloatingActionMenuOutputs {...minimal} editorViewModel={initialEditorViewModel} onChange={onChange} />
    );
    fireEvent.click(getByText('Add an output'));
    const emailMenuItem = await findByRole('button', { name: 'Email' });
    fireEvent.click(emailMenuItem);
    const expectedOnChange = {
      value: minimal.initialValue,
      viewModel: {
        schema: {
          type: 'object',
          properties: {
            email: {
              title: '',
              description: '',
              type: 'string',
              format: 'email',
              'x-ms-content-hint': 'EMAIL',
              'x-ms-dynamically-added': true,
            },
          },
        },
        outputValueSegmentsMap: {},
      },
    };
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining(expectedOnChange));
  });

  it('should call on change with expected object if file menu item selected', async () => {
    const initialEditorViewModel = {
      schema: {
        type: 'object',
        properties: {},
      },
      outputValueSegmentsMap: {},
    };
    const onChange = vi.fn();
    const { getByText, findByRole } = render(
      <FloatingActionMenuOutputs {...minimal} editorViewModel={initialEditorViewModel} onChange={onChange} />
    );
    fireEvent.click(getByText('Add an output'));
    const fileMenuItem = await findByRole('button', { name: 'File' });
    fireEvent.click(fileMenuItem);
    const expectedOnChange = {
      value: minimal.initialValue,
      viewModel: {
        schema: {
          type: 'object',
          properties: {
            file: {
              title: '',
              description: '',
              type: 'string',
              format: 'byte',
              'x-ms-content-hint': 'FILE',
              'x-ms-dynamically-added': true,
            },
          },
        },
        outputValueSegmentsMap: {},
      },
    };
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining(expectedOnChange));
  });
});
