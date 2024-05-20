import { createContext, type MutableRefObject } from 'react';

export interface DataMapperDesignerContext {
  readOnly?: boolean;
  canvasRef?: MutableRefObject<HTMLDivElement | null>;
}

export const DataMapperWrappedContext = createContext<DataMapperDesignerContext | null>(null);
