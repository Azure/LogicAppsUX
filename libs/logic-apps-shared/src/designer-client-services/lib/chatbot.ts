import type { AxiosResponse } from 'axios';
import { AssertionErrorCode, AssertionException } from '../../utils/src';

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
