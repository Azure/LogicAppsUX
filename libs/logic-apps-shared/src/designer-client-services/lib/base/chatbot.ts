import type { IChatbotService } from '../chatbot';
import { ArgumentException } from '@microsoft/logic-apps-shared';
import type { AxiosResponse } from 'axios';
import axios from 'axios';

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
    } else if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required');
    } else if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
  }

  async getCopilotResponse(query: string, workflow: any, signal: AbortSignal, armToken: string): Promise<AxiosResponse<any>> {
    const { baseUrl, subscriptionId, apiVersion, location } = this.options;
    const requestData = {
      properties: {
        query,
        workflow,
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
