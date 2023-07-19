import type { IEditorParameterInfo } from '../editor';
import { EditorService, InitEditorService, isCustomEditor, toEditorAndOptions } from '../editor';

describe('lib/designer-client-services/editor', () => {
  it('should call "getEditor" with initialized service instance', () => {
    const editorService = {
      getEditor: jest.fn(),
    };

    expect(EditorService()).toBeUndefined();

    InitEditorService(editorService);

    const parameter: IEditorParameterInfo = {
      connectorId: 'connectorId',
      operationId: 'operationId',
      parameterKey: 'parameterKey',
      parameterName: 'parameterName',
      required: true,
    };
    EditorService()?.getEditor(parameter);

    expect(editorService.getEditor).toHaveBeenCalledWith(parameter);
  });

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

  describe('toEditorAndOptions', () => {
    it('should return editor value and provided options', () => {
      const editorOptions = { EditorComponent: jest.fn() };
      const props = toEditorAndOptions(editorOptions);

      expect(props).toEqual({ editor: 'internal-custom-editor', editorOptions });
    });
  });
});
