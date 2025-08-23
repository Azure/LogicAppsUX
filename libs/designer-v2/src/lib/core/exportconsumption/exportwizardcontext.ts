import { createContext } from 'react';

export interface ExportWizardContext {
  readOnly?: boolean;
}

export const ExportWizardContextContext = createContext<ExportWizardContext | null>(null);
