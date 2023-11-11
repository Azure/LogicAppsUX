import type { ConnectionParameter } from '@microsoft/logic-apps-designer';

export interface IConnectionParameterInfo {
  connectorId: string;
  parameterKey: string;
}

/**
 * Compatible with `ConnectionParameterProps` from @microsoft/designer-ui but without circular dependencies.
 */
export interface IConnectionParameterEditorProps {
  parameterKey: string;
  parameter: ConnectionParameter;
  value: any;
  setValue: (value: any) => void;
  isLoading?: boolean;
}

export interface IConnectionParameterEditorOptions {
  /**
   * The component to render for the custom editor.
   */
  EditorComponent: React.FunctionComponent<IConnectionParameterEditorProps>;
}

export interface IConnectionParameterEditorService {
  getConnectionParameterEditor(parameter: IConnectionParameterInfo): undefined | IConnectionParameterEditorOptions;
}

let service: IConnectionParameterEditorService | undefined;

export const InitConnectionParameterEditorService = (editorService: IConnectionParameterEditorService | undefined) => {
  service = editorService;
};

export const ConnectionParameterEditorService = (): IConnectionParameterEditorService | undefined => {
  return service;
};
