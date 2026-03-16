import type {
  IConnectionParameterEditorOptions,
  IConnectionParameterEditorService,
  IConnectionParameterInfo,
} from '@microsoft/logic-apps-shared';
import { ACASessionConnector, CustomOpenAIConnector, CosmosDbConnector } from '@microsoft/logic-apps-designer';

export class CustomConnectionParameterEditorService implements IConnectionParameterEditorService {
  public getConnectionParameterEditor({ connectorId }: IConnectionParameterInfo): IConnectionParameterEditorOptions | undefined {
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

    if (connectorId === '/placeholder/knowledgehub') {
      return {
        EditorComponent: CosmosDbConnector,
      };
    }

    return undefined;
  }
}
