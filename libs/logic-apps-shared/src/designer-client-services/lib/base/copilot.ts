import type { ICopilotService, Nl2fExpressionResult } from '../copilot';

export interface CopilotServiceOptions {
  isDev?: boolean;
}

export class BaseCopilotService implements ICopilotService {
  constructor(public readonly options: CopilotServiceOptions) {}

  async getNl2fExpressions(query: string, originalExpression?: string): Promise<Nl2fExpressionResult> {
    const { isDev } = this.options;
    if (isDev) {
      return generateMockResults(query, originalExpression);
    }

    // To be implemented by LAUX team
    return {
      errorMessage: 'API call for getNl2fExpressions has not been set up',
    };
  }
}

export function generateMockResults(query: string, originalExpression?: string): Promise<Nl2fExpressionResult> {
  const potentialMockResults = [
    { suggestions: [{ suggestedExpression: `randomSuggestion1 | query: ${query} | originalExpression: ${originalExpression}` }] },
    {
      suggestions: [
        { suggestedExpression: `randomSuggestion1 | query: ${query} | originalExpression: ${originalExpression}` },
        { suggestedExpression: 'randomSuggestion2' },
      ],
    },
    {
      suggestions: [
        { suggestedExpression: `randomSuggestion1 | query: ${query} | originalExpression: ${originalExpression}` },
        { suggestedExpression: 'randomSuggestion2' },
        { suggestedExpression: 'randomSuggestion3' },
      ],
    },
    { errorMessage: 'Some error message 1' },
  ];

  const randomIndex = Math.floor(Math.random() * potentialMockResults.length);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(potentialMockResults[randomIndex]);
    }, Math.random() * 5000);
  });
}
