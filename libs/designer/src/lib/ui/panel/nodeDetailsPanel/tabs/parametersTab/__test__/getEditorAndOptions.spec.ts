import { getEditorAndOptions } from '..';
import type { VariableDeclaration } from '../../../../../../core/state/tokens/tokensSlice';
import { InitEditorService } from '@microsoft/logic-apps-shared';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { OperationInfo } from '@microsoft/logic-apps-shared';

describe('getEditorAndOptions', () => {
  const operationInfo: OperationInfo = {
    connectorId: 'connectorId',
    operationId: 'operationId',
  };

  const getParameterInfo = (): ParameterInfo => ({
    id: 'parameter-id',
    label: 'parameter-label',
    parameterKey: 'parameter-key',
    parameterName: 'parameter-name',
    required: false,
    type: 'parameter-type',
    value: [],
    info: {},
  });

  it.each`
    editor                  | editorOptions
    ${undefined}            | ${undefined}
    ${'copyable'}           | ${undefined}
    ${'dropdown'}           | ${undefined}
    ${'code'}               | ${undefined}
    ${'combobox'}           | ${undefined}
    ${'schema'}             | ${undefined}
    ${'dictionary'}         | ${undefined}
    ${'table'}              | ${undefined}
    ${'array'}              | ${undefined}
    ${'authentication'}     | ${undefined}
    ${'condition'}          | ${undefined}
    ${'recurrence'}         | ${undefined}
    ${'filepicker'}         | ${undefined}
    ${'html'}               | ${undefined}
    ${'floatingactionmenu'} | ${undefined}
  `('"$editor" editor is returned by default', ({ editor, editorOptions }) => {
    const parameter = getParameterInfo();
    parameter.editor = editor;
    parameter.editorOptions = editorOptions;
    expect(getEditorAndOptions(operationInfo, parameter, /*upstreamNodeIds: */ [], /*variables: */ {})).toEqual({
      editor,
      editorOptions,
    });
  });

  it('"variablename" editor maps to "dropdown"', () => {
    const parameter = getParameterInfo();
    parameter.editor = 'variablename';
    parameter.editorOptions = {
      supportedTypes: ['string'],
    };

    const variables: Record<string, VariableDeclaration[]> = {
      a: [
        {
          name: 'variable-1',
          type: 'string',
        },
        {
          name: 'variable-2',
          type: 'number',
        },
      ],
      b: [
        {
          name: 'variable-3',
          type: 'string',
        },
        {
          name: 'variable-4',
          type: 'number',
        },
      ],
      c: [
        {
          name: 'variable-5',
          type: 'string',
        },
        {
          name: 'variable-6',
          type: 'number',
        },
      ],
    };

    const upstreamNodeIds = ['a', 'b'];

    const expectedEditorAndOptions = {
      editor: 'dropdown',
      editorOptions: {
        options: [
          {
            value: 'variable-1',
            displayName: 'variable-1',
          },
          {
            value: 'variable-3',
            displayName: 'variable-3',
          },
        ],
      },
    };
    expect(getEditorAndOptions(operationInfo, parameter, upstreamNodeIds, variables)).toEqual(expectedEditorAndOptions);
  });

  it('should support EditorService override', () => {
    const customEditorOptions = { EditorComponent: jest.fn() };
    const editorService = {
      getEditor: jest.fn(() => customEditorOptions),
    };
    InitEditorService(editorService);

    const parameter = getParameterInfo();
    const result = getEditorAndOptions(operationInfo, parameter, /*upstreamNodeIds: */ [], /*variables: */ {});

    expect(editorService.getEditor).toHaveBeenCalledWith({
      operationInfo,
      parameter,
    });
    expect(result).toEqual({
      editor: 'internal-custom-editor',
      editorOptions: customEditorOptions,
    });
  });

  it('should apply EditorService override before remapping "variablename" editor', () => {
    const customEditorOptions = { EditorComponent: jest.fn() };
    const editorService = {
      getEditor: jest.fn(() => customEditorOptions),
    };
    InitEditorService(editorService);

    const parameter = getParameterInfo();
    parameter.editor = 'variablename';
    const result = getEditorAndOptions(operationInfo, parameter, /*upstreamNodeIds: */ [], /*variables: */ {});

    expect(editorService.getEditor).toHaveBeenCalledWith({
      operationInfo,
      parameter,
    });
    expect(result).toEqual({
      editor: 'internal-custom-editor',
      editorOptions: customEditorOptions,
    });
  });
});
