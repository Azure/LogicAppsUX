import { createContext } from 'react';

export interface DataMapperDesignerContext {
  readOnly?: boolean;
  canvasBounds?: DOMRect;
}

export const DataMapperWrappedContext = createContext<DataMapperDesignerContext>({});
