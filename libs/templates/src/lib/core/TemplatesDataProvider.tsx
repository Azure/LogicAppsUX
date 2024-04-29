// import type { AppDispatch } from './state/Store';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { TemplatesWrappedContext } from './TemplatesDesignerContext';
import type { Theme as ThemeType, Template } from '@microsoft/logic-apps-shared';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from './state/Store';
import { setInitialTemplate } from './state/TemplateSlice';

export interface TemplatesDataProviderProps {
  //TODO: add what kind of data is needed here
  currentTemplate?: Template;
  theme: ThemeType; // TODO: Currently out of the scope
  children?: React.ReactNode;
}

const DataProviderInner = ({ currentTemplate, children }: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (currentTemplate) {
      dispatch(setInitialTemplate(currentTemplate));
    }
  }, [dispatch, currentTemplate]);

  return <>{children}</>;
};

export const TemplatesDataProvider = (props: TemplatesDataProviderProps) => {
  const wrapped = useContext(TemplatesWrappedContext);
  if (!wrapped) {
    throw new Error('TemplatesDataProvider must be used inside of a DataMapperWrappedContext');
  }

  return <DataProviderInner {...props} />;
};
