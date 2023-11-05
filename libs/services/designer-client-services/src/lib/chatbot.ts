import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';
import type { AxiosResponse } from 'axios';

export interface IChatbotService {
  getCopilotResponse: (query: string, workflow: any, signal: AbortSignal, armToken: string) => Promise<AxiosResponse<any>>;
}

let service: IChatbotService;

export const InitChatbotService = (chatbotService: IChatbotService): void => {
  service = chatbotService;
};

export const ChatbotService = (): IChatbotService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Chatbot Service needs to be initialized before using');
  }

  return service;
};
