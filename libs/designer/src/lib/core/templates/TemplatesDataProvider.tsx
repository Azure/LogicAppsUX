import { TemplatesWrappedContext } from './TemplatesDesignerContext';
// import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../state/templates/store';
import { loadManifestNames } from '../state/templates/manifestSlice';

export interface TemplatesDataProviderProps {
  kinds?: ('stateful' | 'stateless')[];
  skus?: ('Standard' | 'Consumption')[];
  //   theme?: ThemeType;
  children?: React.ReactNode;
}

const DataProviderInner = ({
  kinds,
  skus,
  //   theme = ThemeType.Light,
  children,
}: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();

  console.log('Kinds and SKUs; TODO: only show those qualified ones', kinds, skus);
  //TODO: load templates from ./samples folder.

  useEffect(() => {
    dispatch(loadManifestNames());
  }, [dispatch]);

  return <>{children}</>;
};

export const TemplatesDataProvider = (props: TemplatesDataProviderProps) => {
  const wrapped = useContext(TemplatesWrappedContext);

  if (!wrapped) {
    throw new Error('TemplatesDataProvider must be used inside of a TemplatesWrappedContext');
  }

  return <DataProviderInner {...props} />;
};
