import { ValueSegmentType } from '../../../editor';
import type { CustomTokenFieldProps, SettingTokenFieldProps } from '../settingTokenField';
import { CustomTokenField, SettingTokenField, TokenField } from '../settingTokenField';
import type { IRenderDefaultEditorParams } from '@microsoft/designer-client-services-logic-apps';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/settings/settingTokenField', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  function render<P>(Component: React.FunctionComponent<P>, props: P & JSX.IntrinsicAttributes) {
    renderer.render(<Component {...props} />);
    const output = renderer.getRenderOutput();

    return {
      ...output,
      children: React.Children.toArray(output.props.children),
    };
  }

  describe('SettingTokenField', () => {
    it('should render label and token field', () => {
      const props: SettingTokenFieldProps = {
        label: 'name',
        value: [
          {
            value: 'test',
            type: ValueSegmentType.LITERAL,
            id: '8713da12-1afb-48ce-8fec-429bdb8599b8',
          },
        ],
        tokenEditor: true,
        onCastParameter: jest.fn(),
        getTokenPicker: jest.fn(),
      };

      const { children } = render(SettingTokenField, props);

      expect(children).toHaveLength(2);
      const [label, tokenField] = children as [any, any];

      expect(label.type).toBe('div');
      expect(label.props.className).toBe('msla-input-parameter-label');

      expect(tokenField.type).toBe(TokenField);
      expect(tokenField.props).toEqual({ ...props, labelId: expect.stringContaining('msla-editor-label') });
    });

    it('custom editor: should render label and custom token field', () => {
      const MyCustomEditor = () => <div>My Custom Editor</div>;
      const props: SettingTokenFieldProps = {
        label: 'name',
        value: [
          {
            value: 'test',
            type: ValueSegmentType.LITERAL,
            id: '8713da12-1afb-48ce-8fec-429bdb8599b8',
          },
        ],
        tokenEditor: true,
        onCastParameter: jest.fn(),
        getTokenPicker: jest.fn(),
        editor: 'internal-custom-editor',
        editorOptions: {
          EditorComponent: MyCustomEditor,
          editor: 'dropdown',
          editorOptions: { options: [{ key: '1', value: 'option 1', displayName: 'Option 1' }] },
        },
      };

      const { children } = render(SettingTokenField, props);

      expect(children).toHaveLength(2);
      const [label, tokenField] = children as [any, any];

      expect(label.type).toBe('div');
      expect(label.props.className).toBe('msla-input-parameter-label');

      expect(tokenField.type).toBe(CustomTokenField);
      expect(tokenField.props).toEqual({ ...props, labelId: expect.stringContaining('msla-editor-label') });
    });

    it('custom editor: should support hiding label label', () => {
      const MyCustomEditor = () => <div>My Custom Editor</div>;
      const props: SettingTokenFieldProps = {
        label: 'name',
        value: [
          {
            value: 'test',
            type: ValueSegmentType.LITERAL,
            id: '8713da12-1afb-48ce-8fec-429bdb8599b8',
          },
        ],
        tokenEditor: true,
        onCastParameter: jest.fn(),
        getTokenPicker: jest.fn(),
        editor: 'internal-custom-editor',
        editorOptions: {
          EditorComponent: MyCustomEditor,
          editor: 'dropdown',
          editorOptions: { options: [{ key: '1', value: 'option 1', displayName: 'Option 1' }] },
          hideLabel: true,
        },
      };

      const { children } = render(SettingTokenField, props);

      expect(children).toHaveLength(1);
      const [tokenField] = children as [any];

      expect(tokenField.type).toBe(CustomTokenField);
      expect(tokenField.props).toEqual({ ...props, labelId: expect.stringContaining('msla-editor-label') });
    });
  });

  describe('CustomTokenField', () => {
    it('should render the custom editor component', () => {
      const MyCustomEditor = () => <div>My Custom Editor</div>;
      const props: CustomTokenFieldProps = {
        label: 'name',
        labelId: 'msla-editor-label1',
        value: [
          {
            value: 'test',
            type: ValueSegmentType.LITERAL,
            id: '8713da12-1afb-48ce-8fec-429bdb8599b8',
          },
        ],
        tokenEditor: true,
        onCastParameter: jest.fn(),
        getTokenPicker: jest.fn(),
        editor: 'internal-custom-editor',
        editorOptions: {
          EditorComponent: MyCustomEditor,
          editor: 'dropdown',
          editorOptions: { options: [{ key: '1', value: 'option 1', displayName: 'Option 1' }] },
          hideLabel: true,
        },
      };

      const customTokenField = render(CustomTokenField, props);

      expect(customTokenField.type).toBe(MyCustomEditor);
      expect(customTokenField.props).toEqual({
        editor: props.editorOptions?.editor,
        editorOptions: props.editorOptions?.editorOptions,
        value: props.value,
        onValueChange: props.onValueChange,
        renderDefaultEditor: expect.any(Function),
      });

      const defaultEditorParams: IRenderDefaultEditorParams = {
        editor: 'dropdown',
        editorOptions: {
          options: [{ key: '1', value: 'option 1', displayName: 'Option 1' }],
        },
        value: [],
        onValueChange: jest.fn(),
      };
      const defaultEditor = customTokenField.props.renderDefaultEditor(defaultEditorParams);

      expect(defaultEditor.type).toBe(TokenField);
      // props from custom editor call
      expect(defaultEditor.props.editor).toBe(defaultEditorParams.editor);
      expect(defaultEditor.props.editorOptions).toBe(defaultEditorParams.editorOptions);
      expect(defaultEditor.props.onValueChange).toBe(defaultEditorParams.onValueChange);
      expect(defaultEditor.props.value).toBe(defaultEditorParams.value);
      // props from initial setting token field
      expect(defaultEditor.props.label).toBe(props.label);
      expect(defaultEditor.props.onCastParameter).toBe(props.onCastParameter);
      expect(defaultEditor.props.getTokenPicker).toBe(props.getTokenPicker);
    });
  });
});
