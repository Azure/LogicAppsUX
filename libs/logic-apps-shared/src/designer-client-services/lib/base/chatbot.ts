import type { IChatbotService } from '../chatbot';
import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { ArgumentException, type DocumentationMetadataState } from '../../../utils/src';

export interface ChatbotServiceOptions {
  baseUrl: string;
  subscriptionId: string;
  apiVersion: string;
  location: string;
}

export class BaseChatbotService implements IChatbotService {
  constructor(public readonly options: ChatbotServiceOptions) {
    const { baseUrl, subscriptionId, apiVersion } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }
    if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required');
    }
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
  }

  async getCopilotResponse(query: string, workflow: any, signal: AbortSignal, armToken: string): Promise<AxiosResponse<any>> {
    const queryData = {
      prompt: query,
      workflow,
    };
    return this._getCopilotResponseV2('chatbot', queryData, signal, armToken);
  }

  async getCopilotDocumentation(operationsData: DocumentationMetadataState, workflow: any, armToken: string): Promise<AxiosResponse<any>> {
    const queryData = {
      workflow,
      operationsData,
    };
    return this._getCopilotResponseV2('documentation', queryData, undefined, armToken);
  }

  async _getCopilotResponseV2(
    queryType: 'chatbot' | 'documentation',
    query: any,
    signal: AbortSignal | undefined,
    armToken: string
  ): Promise<AxiosResponse<any>> {
    const { baseUrl, subscriptionId, apiVersion, location } = this.options;
    const requestData = {
      properties: {
        queryType,
        query,
      },
    };
    const uri = `${baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Logic/locations/${location}/generateCopilotResponse`;
    const response = await axios.post(uri, requestData, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: armToken,
      },
      params: { 'api-version': apiVersion },
      signal,
    });
    return response;
  }
}
