import type { IEditorParameterInfo, IEditorService } from '@microsoft/logic-apps-shared';
import { IncrementVariableEditor } from './customEditor/IncrementVariableEditor';
import { InitializeVariableEditor } from './customEditor/initializeVariableEditor';

export class CustomEditorService implements IEditorService {
  public areCustomEditorsEnabled = false;

  public getEditor = (props: IEditorParameterInfo) => {
    const { operationInfo, parameter } = props;
    const { connectorId, operationId } = operationInfo ?? {};
    const { parameterName, editor, editorOptions } = parameter ?? {};

    if (!this.areCustomEditorsEnabled) {
      return undefined;
    }

    if (connectorId === 'connectionProviders/variable' && operationId === 'incrementvariable' && parameterName === 'value') {
      return {
        EditorComponent: IncrementVariableEditor,
        hideLabel: true,
        editor,
        editorOptions,
      };
    }

    if (connectorId === 'connectionProviders/variable' && operationId === 'initializevariable' && parameterName === 'value') {
      return {
        EditorComponent: InitializeVariableEditor,
        hideLabel: true,
        editor,
        editorOptions,
      };
    }

    return undefined;
  };
}
