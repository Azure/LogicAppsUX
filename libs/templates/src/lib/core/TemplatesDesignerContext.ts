import type { IConnectionService } from '@microsoft/logic-apps-shared';
import { createContext } from 'react';

export interface TemplatesDesignerContext {
  connectionService?: IConnectionService;
}

export const TemplatesWrappedContext = createContext<TemplatesDesignerContext | null>(null);
