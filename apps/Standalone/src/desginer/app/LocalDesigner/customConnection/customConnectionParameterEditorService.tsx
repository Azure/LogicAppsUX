import type {
  IConnectionParameterEditorOptions,
  IConnectionParameterEditorService,
  IConnectionParameterInfo,
} from '@microsoft/logic-apps-shared';
import { TargetPicker } from './TargetPicker';

export class CustomConnectionParameterEditorService implements IConnectionParameterEditorService {
  public areCustomEditorsEnabled = false;

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

    return undefined;
  }
}
