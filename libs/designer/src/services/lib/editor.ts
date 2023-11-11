import type { ChangeHandler, ParameterInfo, ValueSegment , OperationInfo } from '@microsoft/logic-apps-designer';

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
}

export interface IEditorParameterInfo {
  operationInfo: OperationInfo;
  parameter: ParameterInfo;
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
