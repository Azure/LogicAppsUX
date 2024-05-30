import { AssertionErrorCode, AssertionException } from '../../utils/src';

export interface Nl2fSuggestedExpression {
  suggestedExpression: string;
  explanation?: string;
}
export interface Nl2fExpressionResult {
  suggestions?: Nl2fSuggestedExpression[];
  errorMessage?: string;
}

export interface ICopilotService {
  getNl2fExpressions: (query: string, originalExpression?: string, signal?: AbortSignal) => Promise<Nl2fExpressionResult>;
}

let service: ICopilotService;

export const InitCopilotService = (copilotService: ICopilotService): void => {
  service = copilotService;
};

export const CopilotService = (): ICopilotService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Copilot Service needs to be initialized before using');
  }

  return service;
};

export const isCopilotServiceEnabled = (): boolean => {
  return !!service;
};
