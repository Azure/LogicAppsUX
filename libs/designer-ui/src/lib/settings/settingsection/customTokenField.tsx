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
import { equals } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';

export type CustomTokenFieldProps = Omit<TokenFieldProps, 'editor' | 'editorOptions'> & ICustomEditorAndOptions;

export const CustomTokenField = (props: CustomTokenFieldProps) => {
  const { EditorComponent, editor, editorOptions = {} }: ICustomEditorOptions = props.editorOptions;

  const renderDefaultEditor = useRenderDefaultEditor(props);

  const customEditorProps: IEditorProps = {
    editor,
    editorOptions,
    value: props.value,
    onValueChange: props.onValueChange as CustomEditorChangeHandler,
    renderDefaultEditor,
    disabled: props.readOnly,
  };
  return <EditorComponent {...customEditorProps} />;
};

function useRenderDefaultEditor(tokenFieldProps: Omit<TokenFieldProps, 'editor' | 'editorOptions' | 'value' | 'onValueChange'>) {
  return useCallback(
    (props: IRenderDefaultEditorParams) => {
      return (
        <TokenField
          {...tokenFieldProps}
          editor={props.editor}
          editorOptions={props.editorOptions}
          value={props.value as ValueSegment[]}
          onValueChange={props.onValueChange as ChangeHandler}
        />
      );
    },
    [tokenFieldProps]
  );
}

// Overridden custom editors are identified by this name internally.
const customEditorName = 'internal-custom-editor';

export type ICustomEditorAndOptions = { editor: typeof customEditorName; editorOptions: ICustomEditorOptions };

export const isCustomEditor = (props: { editor?: string | undefined; editorOptions?: unknown }): props is ICustomEditorAndOptions => {
  const { editor, editorOptions } = props;
  return (
    equals(editor, customEditorName) &&
    typeof editorOptions == 'object' &&
    !!editorOptions &&
    typeof (editorOptions as { EditorComponent: unknown }).EditorComponent === 'function'
  );
};

export const toCustomEditorAndOptions = (options: ICustomEditorOptions) => ({
  editor: customEditorName,
  editorOptions: options,
});
