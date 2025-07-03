import { createContext } from 'react';

export interface McpWizardContext {
  readOnly?: boolean;
}

export const McpWrappedContext = createContext<McpWizardContext | null>(null);
