import type { IEditorParameterInfo } from '../editor';
import { EditorService, InitEditorService } from '../editor';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/designer-client-services/editor', () => {
  it('should call "getEditor" with initialized service instance', () => {
    const editorService = {
      getEditor: vi.fn(),
    };

    expect(EditorService()).toBeUndefined();

    InitEditorService(editorService);

    const parameter: IEditorParameterInfo = {
      operationInfo: {
        connectorId: 'connectorId',
        operationId: 'operationId',
      },
      parameter: {
        parameterKey: 'parameterKey',
        parameterName: 'parameterName',
        required: true,
        info: undefined,
        id: 'parameterId',
        label: 'parameterLabel',
        type: '',
        value: [],
      },
    };
    EditorService()?.getEditor(parameter);

    expect(editorService.getEditor).toHaveBeenCalledWith(parameter);
  });
});
