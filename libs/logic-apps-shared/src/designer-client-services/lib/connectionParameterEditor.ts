import type { ConnectionParameter, ConnectionParameterSetParameter } from '@microsoft/logic-apps-shared';

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

export interface IConnectionCredentialMappingInfo {
  connectorId: string;
  mappingName: string;
  parameters: {
    [key: string]: ConnectionParameterSetParameter | ConnectionParameter;
  };
}

export interface IConnectionCredentialMappingEditorProps {
  connectorId: string;
  mappingName: string;
  parameters: {
    [key: string]: ConnectionParameterSetParameter | ConnectionParameter;
  };
  setParameterValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  renderParameter: (key: string, parameter: ConnectionParameterSetParameter | ConnectionParameter) => JSX.Element;
  isLoading?: boolean;
}

export interface IConnectionCredentialMappingOptions {
  /**
   * The component to render for the Credential Mapping editor.
   */
  EditorComponent: React.FunctionComponent<IConnectionCredentialMappingEditorProps>;
}

export interface IConnectionParameterEditorService {
  getConnectionParameterEditor(parameter: IConnectionParameterInfo): undefined | IConnectionParameterEditorOptions;
  getCredentialMappingEditorOptions?(mappingParams: IConnectionCredentialMappingInfo): undefined | IConnectionCredentialMappingOptions;
}

let service: IConnectionParameterEditorService | undefined;

export const InitConnectionParameterEditorService = (editorService: IConnectionParameterEditorService | undefined) => {
  service = editorService;
};

export const ConnectionParameterEditorService = (): IConnectionParameterEditorService | undefined => {
  return service;
};
