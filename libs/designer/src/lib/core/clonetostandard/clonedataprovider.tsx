import type React from 'react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/clonetostandard/store';
import { type ResourceState, setResourceData } from '../state/clonetostandard/resourceslice';
import { initializeCloneServices, type CloneServiceOptions } from '../actions/bjsworkflow/clone';

export interface ExportDataProviderProps {
  resourceDetails: ResourceState;
  services: CloneServiceOptions;
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>;
};

export const CloneDataProvider = ({ resourceDetails, services, children }: ExportDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { servicesInitialized } = useSelector((state: RootState) => ({
    servicesInitialized: state.cloneOptions.servicesInitialized,
  }));

  useEffect(() => {
    if (!servicesInitialized) {
      dispatch(initializeCloneServices(services));
    }
  }, [dispatch, servicesInitialized, services]);

  useEffect(() => {
    dispatch(setResourceData(resourceDetails));
  }, [dispatch, resourceDetails]);

  if (!servicesInitialized) {
    return null;
  }

  return <DataProviderInner>{children}</DataProviderInner>;
};
