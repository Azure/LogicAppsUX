import type {
  IConnectionParameterEditorOptions,
  IConnectionParameterEditorService,
  IConnectionParameterInfo,
} from '@microsoft/logic-apps-shared';
import { CustomOpenAIConnector } from '@microsoft/logic-apps-designer';

export class CustomConnectionParameterEditorService implements IConnectionParameterEditorService {
  public getConnectionParameterEditor({ connectorId }: IConnectionParameterInfo): IConnectionParameterEditorOptions | undefined {
    if (connectorId === 'connectionProviders/agent') {
      return {
        EditorComponent: CustomOpenAIConnector,
      };
    }

    return undefined;
  }
}
