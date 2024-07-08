import { createContext } from 'react';

export interface DataMapperDesignerContext {
  readOnly?: boolean;
  canvasBounds?: {
    width: number;
    height: number;
  };
}

export const DataMapperWrappedContext = createContext<DataMapperDesignerContext>({});
