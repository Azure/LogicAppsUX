import { createContext } from 'react';

export type Bounds = {
  x?: number;
  y?: number;
  height?: number;
  width?: number;
};

export type ScrollProps = {
  scrollTop: number;
  scrollHeight: number;
  onScroll: (scrollTop: number) => void;
  preventScroll?: boolean;
};

export type ScrollLocation = 'source' | 'target' | 'canvas';
export interface DataMapperDesignerContext {
  readOnly?: boolean;
  scroll?: {
    source?: ScrollProps;
    target?: ScrollProps;
    canvas?: ScrollProps;
    setScroll: (scrollProps: ScrollProps, location: ScrollLocation) => void;
  };
}

export const DataMapperWrappedContext = createContext<DataMapperDesignerContext>({
  scroll: { setScroll: (_s, _l) => {} },
});
