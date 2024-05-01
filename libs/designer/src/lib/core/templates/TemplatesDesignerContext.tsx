import { createContext } from 'react';

export interface TemplatesDesignerContext {
  readOnly?: boolean;
}

//TODO: evaluate if this context is needed at all
export const TemplatesWrappedContext = createContext<TemplatesDesignerContext | null>(null);
