import { equals } from '@microsoft/utils-logic-apps';

/**
 * Compatible with `ValueSegment` from @microsoft/designer-ui but without circular dependencies.
 */
interface ValueSegment {
  id: string;
  type: 'literal' | 'token';
  value: string;
  token?: any;
}

export interface IEditorParameterInfo {
  connectorId: string;
  operationId: string;
  parameterKey: string;
  parameterName: string;
  required: boolean;
  schema?: any;
  editor?: string;
  editorOptions?: Record<string, any>;
}

export type IEditorValueSegmentChangeEvent = { value: ValueSegment[] };
export type IEditorValueSegmentChangeHandler = (change: IEditorValueSegmentChangeEvent) => void;
export type IRenderDefaultEditorParams = {
  editor?: string;
  editorOptions?: Record<string, any>;
  value: ValueSegment[];
  onValueChange?: IEditorValueSegmentChangeHandler;
};

export interface IEditorProps {
  /**
   * Current value.
   */
  value: ValueSegment[];
  /**
   * Callback when the value changes.
   */
  onValueChange?: IEditorValueSegmentChangeHandler;
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

export interface IEditorService {
  getEditor(parameter: IEditorParameterInfo): undefined | ICustomEditorOptions;
}

let service: IEditorService | undefined;

export const InitEditorService = (editorService: IEditorService | undefined) => {
  service = editorService;
};

export const EditorService = (): IEditorService | undefined => {
  return service;
};

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

export const toEditorAndOptions = (options: ICustomEditorOptions) => ({
  editor: customEditorName,
  editorOptions: options,
});
