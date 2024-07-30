import { createContext } from 'react';

export type Bounds = {
  x?: number;
  y?: number;
  height?: number;
  width?: number;
};

export interface DataMapperDesignerContext {
  readOnly?: boolean;
  canvasBounds?: Bounds;
}

export const DataMapperWrappedContext = createContext<DataMapperDesignerContext>({});
