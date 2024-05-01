import { createContext } from 'react';

export interface TemplatesDesignerContext {
  readOnly?: boolean;
}

export const TemplatesWrappedContext = createContext<TemplatesDesignerContext | null>(null);
