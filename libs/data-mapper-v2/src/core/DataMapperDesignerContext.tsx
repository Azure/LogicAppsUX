import { createContext } from "react";

export interface DataMapperDesignerContext {
  readOnly?: boolean;
  canvasBounds?: {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
  };
}

export const DataMapperWrappedContext =
  createContext<DataMapperDesignerContext>({});
