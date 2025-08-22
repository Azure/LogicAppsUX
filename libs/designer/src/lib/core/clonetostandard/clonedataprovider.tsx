import type React from 'react';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../state/clonetostandard/store';
import { type ResourceState, setResourceData } from '../state/clonetostandard/resourceslice';

export interface ExportDataProviderProps {
  resourceDetails: ResourceState;
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>;
};

export const CloneDataProvider = ({ resourceDetails, children }: ExportDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(setResourceData(resourceDetails));
  }, [dispatch, resourceDetails]);

  return <DataProviderInner>{children}</DataProviderInner>;
};
