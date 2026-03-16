import { CosmosDbConnector, CustomOpenAIConnector } from '@microsoft/logic-apps-designer';
import {
  equals,
  type IConnectionParameterEditorOptions,
  type IConnectionParameterEditorService,
  type IConnectionParameterInfo,
} from '@microsoft/logic-apps-shared';

export class CustomConnectionParameterEditorService implements IConnectionParameterEditorService {
  public getConnectionParameterEditor({
    connectorId,
    parameterKey,
  }: IConnectionParameterInfo): IConnectionParameterEditorOptions | undefined {
    if (connectorId === 'connectionProviders/agent') {
      if (
        equals(parameterKey, 'cognitiveServiceAccountId') ||
        equals(parameterKey, 'openAIEndpoint') ||
        equals(parameterKey, 'openAIKey')
      ) {
        return {
          EditorComponent: CustomOpenAIConnector,
        };
      }

      return undefined;
    }

    if (connectorId === '/placeholder/knowledgehub') {
      return {
        EditorComponent: CosmosDbConnector,
      };
    }

    return undefined;
  }
}
