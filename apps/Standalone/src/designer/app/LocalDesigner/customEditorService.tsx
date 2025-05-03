import type { IEditorParameterInfo, IEditorService } from '@microsoft/logic-apps-shared';
import { CustomEditorIncrementVariable } from './customEditor/CustomEditorIncrementVariable';
import { CustomEditorInitializeVariable } from './customEditor/CustomEditorInitializeVariable';

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
        EditorComponent: CustomEditorIncrementVariable,
        hideLabel: true,
        editor,
        editorOptions,
      };
    }

    if (connectorId === 'connectionProviders/variable' && operationId === 'initializevariable' && parameterName === 'value') {
      return {
        EditorComponent: CustomEditorInitializeVariable,
        hideLabel: true,
        editor,
        editorOptions,
      };
    }

    return undefined;
  };

  public getCreateNewEditor = (connectorId?: string) => {
    if (connectorId === 'connectionProviders/agent') {
      return {
        editor: <span />,
      };
    }
    return undefined;
  };
}
