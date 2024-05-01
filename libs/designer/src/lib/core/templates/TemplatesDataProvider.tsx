import { TemplatesWrappedContext } from './TemplatesDesignerContext';
// import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { loadManifestNames, loadManifests } from '../state/templates/manifestSlice';

export interface TemplatesDataProviderProps {
  kinds?: ('stateful' | 'stateless')[];
  skus?: ('Standard' | 'Consumption')[];
  children?: React.ReactNode;
}

const DataProviderInner = ({
  // kinds,
  // skus,
  children,
}: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { availableManifestNames } = useSelector((state: RootState) => state.manifest);

  useEffect(() => {
    if (availableManifestNames) {
      dispatch(loadManifests({}));
    }
  }, [dispatch, availableManifestNames]);

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
