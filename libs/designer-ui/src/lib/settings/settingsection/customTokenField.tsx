import constants from '../../constants';
import type { ValueSegment } from '../../editor';
import type { ChangeHandler } from '../../editor/base';
import type { TokenFieldProps } from './settingTokenField';
import { TokenField } from './settingTokenField';
import type {
  ChangeHandler as CustomEditorChangeHandler,
  ICustomEditorOptions,
  IEditorProps,
  IRenderDefaultEditorParams,
} from '@microsoft/logic-apps-shared';
import { equals, isObject } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';

export type CustomTokenFieldProps = Omit<TokenFieldProps, 'editor' | 'editorOptions'> & ICustomEditorAndOptions;

export const CustomTokenField = ({
  editorOptions = {} as ICustomEditorOptions,
  value,
  onValueChange,
  readOnly,
  tokenMapping,
  ...props
}: CustomTokenFieldProps) => {
  const { EditorComponent, editor } = editorOptions;
  const renderDefaultEditor = useRenderDefaultEditor({ ...props, tokenMapping });

  const customEditorProps: IEditorProps = {
    editor,
    editorOptions,
    value,
    onValueChange: onValueChange as CustomEditorChangeHandler,
    renderDefaultEditor,
    disabled: readOnly,
    tokenMapping,
  };

  return EditorComponent ? <EditorComponent {...customEditorProps} /> : null;
};

function useRenderDefaultEditor(tokenFieldProps: Omit<TokenFieldProps, 'editor' | 'editorOptions' | 'value' | 'onValueChange'>) {
  return useCallback(
    ({ editor, editorOptions, value, onValueChange }: IRenderDefaultEditorParams) => (
      <TokenField
        {...tokenFieldProps}
        editor={editor}
        editorOptions={editorOptions}
        value={value as ValueSegment[]}
        onValueChange={onValueChange as ChangeHandler}
      />
    ),
    [tokenFieldProps]
  );
}

export interface ICustomEditorAndOptions {
  editor?: string;
  editorOptions?: ICustomEditorOptions;
}

export const isCustomEditor = ({ editor, editorOptions }: ICustomEditorAndOptions) => {
  return (
    editorOptions?.visibility === 'custom' ||
    (equals(editor, constants.PARAMETER.EDITOR.CUSTOMEDITORNAME) &&
      isObject(editorOptions) &&
      typeof (editorOptions as { EditorComponent: unknown }).EditorComponent === 'function')
  );
};

export const toCustomEditorAndOptions = (options: ICustomEditorOptions) => ({
  editor: constants.PARAMETER.EDITOR.CUSTOMEDITORNAME,
  editorOptions: options,
});
