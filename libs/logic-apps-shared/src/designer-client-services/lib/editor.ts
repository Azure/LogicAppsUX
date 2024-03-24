import type { OperationInfo } from '@microsoft/logic-apps-shared';

/**
 * Compatible with `ValueSegment` from @microsoft/designer-ui but without circular dependencies.
 */
export interface ValueSegment {
  id: string;
  type: 'literal' | 'token';
  value: string;
  token?: any;
}

/**
 * Compatible with `ChangeHandler` from @microsoft/designer-ui but without circular dependencies.
 */
export type ChangeHandler = (change: { value: ValueSegment[]; viewModel?: any }) => void;

/**
 * Compatible with `ParameterInfo` from @microsoft/designer-ui but without circular dependencies.
 */
export interface ParameterInfo {
  alternativeKey?: string;
  conditionalVisibility?: boolean;
  dynamicData?: {
    error?: any;
    status: any;
  };
  editor?: string;
  editorOptions?: Record<string, any>;
  editorViewModel?: any;
  info: any;
  hideInUI?: boolean;
  id: string;
  label: string;
  parameterKey: string;
  parameterName: string;
  pattern?: string;
  placeholder?: string;
  preservedValue?: any;
  required: boolean;
  schema?: any;
  showErrors?: boolean;
  showTokens?: boolean;
  suppressCasting?: boolean;
  type: string;
  validationErrors?: string[];
  value: ValueSegment[];
  visibility?: string;
}

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
