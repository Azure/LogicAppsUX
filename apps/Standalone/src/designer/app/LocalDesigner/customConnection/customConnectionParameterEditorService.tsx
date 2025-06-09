import type {
  IConnectionParameterEditorOptions,
  IConnectionParameterEditorService,
  IConnectionParameterInfo,
} from '@microsoft/logic-apps-shared';
import { TargetPicker } from './TargetPicker';
import { ACASessionConnector, CustomOpenAIConnector } from '@microsoft/logic-apps-designer';

export class CustomConnectionParameterEditorService implements IConnectionParameterEditorService {
  public areCustomEditorsEnabled = true;

  public getConnectionParameterEditor({
    connectorId,
    parameterKey,
  }: IConnectionParameterInfo): IConnectionParameterEditorOptions | undefined {
    if (!this.areCustomEditorsEnabled) {
      return undefined;
    }

    if (connectorId === '/providers/Microsoft.PowerApps/apis/shared_uiflow' && parameterKey === 'targetId') {
      return {
        EditorComponent: TargetPicker,
      };
    }

    if (connectorId === 'connectionProviders/agent') {
      return {
        EditorComponent: CustomOpenAIConnector,
      };
    }

    if (connectorId === '/serviceProviders/acasession') {
      return {
        EditorComponent: ACASessionConnector,
      };
    }

    return undefined;
  }
}
