import {
  equals,
  type IConnectionParameterEditorOptions,
  type IConnectionParameterEditorService,
  type IConnectionParameterInfo,
} from '@microsoft/logic-apps-shared';
import { ACASessionConnector, CustomOpenAIConnector, CosmosDbConnector } from '@microsoft/logic-apps-designer';

export class CustomConnectionParameterEditorService implements IConnectionParameterEditorService {
  public getConnectionParameterEditor({
    connectorId,
    parameterKey,
  }: IConnectionParameterInfo): IConnectionParameterEditorOptions | undefined {
    if (connectorId === 'connectionProviders/agent') {
      if (!equals(parameterKey, 'openAICompletionsModel') && !equals(parameterKey, 'openAIEmbeddingsModel')) {
        return {
          EditorComponent: CustomOpenAIConnector,
        };
      }

      return undefined;
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
