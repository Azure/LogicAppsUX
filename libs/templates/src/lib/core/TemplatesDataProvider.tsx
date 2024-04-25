// import type { AppDispatch } from './state/Store';
import type React from 'react';
import { useContext } from 'react';
import { TemplatesWrappedContext } from './TemplatesDesignerContext';
// import { useDispatch } from 'react-redux';

export interface TemplatesDataProviderProps {
  //TODO: add what kind of data is needed here
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: TemplatesDataProviderProps) => {
  // const dispatch = useDispatch<AppDispatch>();

  return <>{children}</>;
};

export const TemplatesDataProvider = (props: TemplatesDataProviderProps) => {
  const wrapped = useContext(TemplatesWrappedContext);
  if (!wrapped) {
    throw new Error('TemplatesDataProvider must be used inside of a DataMapperWrappedContext');
  }

  return <DataProviderInner {...props} />;
};
