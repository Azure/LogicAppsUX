import { createContext } from 'react';

export interface DataMapperDesignerContext {
  readOnly?: boolean;
}

export const DataMapperWrappedContext = createContext<DataMapperDesignerContext | null>(null);
