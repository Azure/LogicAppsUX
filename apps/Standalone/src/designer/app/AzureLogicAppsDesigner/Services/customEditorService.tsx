import type { IEditorParameterInfo, IEditorService } from '@microsoft/logic-apps-shared';
import { CustomEditorIncrementVariable } from './customEditor/CustomEditorIncrementVariable';
import { CustomEditorInitializeVariable } from './customEditor/CustomEditorInitializeVariable';
import { CustomDeploymentModelResource } from '@microsoft/logic-apps-designer';

export class CustomEditorService implements IEditorService {
  public areCustomEditorsEnabled = true;

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

  public getNewResourceEditor = (props: IEditorParameterInfo) => {
    const { operationInfo, parameter } = props;
    const { connectorId } = operationInfo ?? {};
    const { parameterName } = parameter ?? {};

    if (!this.areCustomEditorsEnabled) {
      return undefined;
    }

    if (connectorId === 'connectionProviders/agent' && parameterName === 'deploymentId') {
      return {
        EditorComponent: CustomDeploymentModelResource,
        hideLabel: false,
      };
    }

    return undefined;
  };
}
