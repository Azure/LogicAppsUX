import { ValueSegmentType } from '../../../editor';
import type { CustomTokenFieldProps } from '../customTokenField';
import { CustomTokenField, isCustomEditor, toCustomEditorAndOptions } from '../customTokenField';
import { TokenField } from '../settingTokenField';
import type { IRenderDefaultEditorParams } from '@microsoft/logic-apps-shared';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/settings/customTokenField', () => {
  describe('isCustomEditor', () => {
    it.each`
      editor                      | editorOptions                      | expected
      ${undefined}                | ${undefined}                       | ${false}
      ${'test'}                   | ${undefined}                       | ${false}
      ${'copyable'}               | ${undefined}                       | ${false}
      ${'dropdown'}               | ${undefined}                       | ${false}
      ${'code'}                   | ${undefined}                       | ${false}
      ${'combobox'}               | ${undefined}                       | ${false}
      ${'schema'}                 | ${undefined}                       | ${false}
      ${'dictionary'}             | ${undefined}                       | ${false}
      ${'table'}                  | ${undefined}                       | ${false}
      ${'array'}                  | ${undefined}                       | ${false}
      ${'authentication'}         | ${undefined}                       | ${false}
      ${'condition'}              | ${undefined}                       | ${false}
      ${'recurrence'}             | ${undefined}                       | ${false}
      ${'filepicker'}             | ${undefined}                       | ${false}
      ${'html'}                   | ${undefined}                       | ${false}
      ${'floatingactionmenu'}     | ${undefined}                       | ${false}
      ${'string'}                 | ${undefined}                       | ${false}
      ${'internal-custom-editor'} | ${undefined}                       | ${false}
      ${'internal-custom-editor'} | ${{}}                              | ${false}
      ${'internal-custom-editor'} | ${{ EditorComponent: {} }}         | ${false}
      ${'internal-custom-editor'} | ${{ EditorComponent: () => null }} | ${true}
    `('editor "$editor" with $editorOptions should return $expected', ({ editor, editorOptions, expected }) =>
      expect(isCustomEditor({ editor, editorOptions })).toBe(expected)
    );
  });

  describe('toCustomEditorAndOptions', () => {
    it('should return editor value and provided options', () => {
      const editorOptions = { EditorComponent: jest.fn() };
      const props = toCustomEditorAndOptions(editorOptions);

      expect(props).toEqual({ editor: 'internal-custom-editor', editorOptions });
    });
  });

  describe('CustomTokenField', () => {
    let renderer: ReactShallowRenderer.ShallowRenderer;

    beforeEach(() => {
      renderer = ReactShallowRenderer.createRenderer();
    });

    afterEach(() => {
      renderer.unmount();
    });

    const MyCustomEditor = () => <div>My Custom Editor</div>;
    const getCustomTokenFieldProps = (): CustomTokenFieldProps => ({
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
    });

    it('should render the custom editor component', () => {
      const props = getCustomTokenFieldProps();
      renderer.render(<CustomTokenField {...props} />);
      const customTokenField = renderer.getRenderOutput();

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

    it.each([true, false, undefined])(`should render the custom editor with "disabled" set to %s`, (disabled) => {
      const props = getCustomTokenFieldProps();
      props.readOnly = disabled;

      renderer.render(<CustomTokenField {...props} />);
      const customTokenField = renderer.getRenderOutput();

      expect(customTokenField.type).toBe(MyCustomEditor);
      expect(customTokenField.props).toEqual({
        editor: props.editorOptions?.editor,
        editorOptions: props.editorOptions?.editorOptions,
        value: props.value,
        onValueChange: props.onValueChange,
        renderDefaultEditor: expect.any(Function),
        disabled: props.readOnly,
      });
    });
  });
});
