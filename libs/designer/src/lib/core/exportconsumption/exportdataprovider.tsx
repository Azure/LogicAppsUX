import type React from 'react';
import { useEffect } from 'react';
import type { ResourceState } from '../state/exportconsumption/resourceSlice';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../state/exportconsumption/store';
import { setResourceData } from '../state/exportconsumption/resourceSlice';

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
    dispatch(
      setResourceData({
        subscriptionId: resourceDetails.subscriptionId,
        resourceGroup: resourceDetails.resourceGroup,
        location: resourceDetails.location,
        logicAppName: resourceDetails.logicAppName,
      })
    );
  }, [dispatch, resourceDetails]);

  return <DataProviderInner>{children}</DataProviderInner>;
};
