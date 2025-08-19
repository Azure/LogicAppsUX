import type React from 'react';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../state/exportconsumption/store';
import { type ResourceState, setResourceData } from '../state/exportconsumption/resourceslice';

export interface ExportDataProviderProps {
  resourceDetails: ResourceState;
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>;
};

export const ExportDataProvider = ({ resourceDetails, children }: ExportDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(setResourceData(resourceDetails));
  }, [dispatch, resourceDetails]);

  return <DataProviderInner>{children}</DataProviderInner>;
};
