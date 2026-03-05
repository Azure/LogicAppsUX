import { createContext } from 'react';

export interface KnowledgeWizardContext {
  readOnly?: boolean;
}

export const KnowledgeWrappedContext = createContext<KnowledgeWizardContext | null>(null);