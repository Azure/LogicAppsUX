import type { ValueSegment } from '../../editor';
import type { ChangeHandler } from '../../editor/base';
import type { TokenFieldProps } from './settingTokenField';
import { TokenField } from './settingTokenField';
import { equals } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';

export type IRenderDefaultEditorParams = {
  editor?: string;
  editorOptions?: Record<string, any>;
  value: ValueSegment[];
  onValueChange?: ChangeHandler;
};

export interface IEditorProps {
  /**
   * Current value.
   */
  value: ValueSegment[];
  /**
   * Callback when the value changes.
   */
  onValueChange?: ChangeHandler;
  /**
   * The original editor value.
   */
  editor?: string;
  /**
   * The original editor options.
   */
  editorOptions?: Record<string, any>;
  /**
   * Render the base (non-custom) editor corresponding to the provided options.
   */
  renderDefaultEditor: (params: IRenderDefaultEditorParams) => JSX.Element;
  /**
   * Whether the editor is disabled.
   */
  disabled?: boolean;
}

export interface ICustomEditorOptions {
  /**
   * The component to render for the custom editor.
   */
  EditorComponent: React.FunctionComponent<IEditorProps>;
  /**
   * Whether to hide the label for the custom editor.
   */
  hideLabel?: boolean;
  /**
   * The original editor value.
   */
  editor?: string;
  /**
   * The original editor options.
   */
  editorOptions?: Record<string, any>;
}

export type CustomTokenFieldProps = Omit<TokenFieldProps, 'editor' | 'editorOptions'> & ICustomEditorAndOptions;

export const CustomTokenField = (props: CustomTokenFieldProps) => {
  const { EditorComponent, editor, editorOptions = {} }: ICustomEditorOptions = props.editorOptions;

  const renderDefaultEditor = useRenderDefaultEditor(props);

  const customEditorProps: IEditorProps = {
    editor,
    editorOptions,
    value: props.value,
    onValueChange: props.onValueChange as ChangeHandler,
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
