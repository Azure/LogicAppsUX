import type React from 'react';
import { useEffect } from 'react';
import type { ResourceState } from '../state/mcp/resourceSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/mcp/store';
import { setInitialData } from '../state/mcp/resourceSlice';
import { initializeMcpServices, type McpServiceOptions } from '../actions/bjsworkflow/mcp';

export interface McpDataProviderProps {
  resourceDetails: ResourceState;
  services: McpServiceOptions;
  onResourceChange?: () => void;
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>;
};

export const McpDataProvider = ({ resourceDetails, services, onResourceChange, children }: McpDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const { logicAppId, servicesInitialized } = useSelector((state: RootState) => ({
    logicAppId: state.resource.logicAppId,
    servicesInitialized: state.mcpOptions.servicesInitialized,
  }));

  useEffect(() => {
    if (!servicesInitialized && services) {
      dispatch(initializeMcpServices(services));
    }
  }, [dispatch, servicesInitialized, services]);

  useEffect(() => {
    dispatch(
      setInitialData({
        subscriptionId: resourceDetails.subscriptionId,
        resourceGroup: resourceDetails.resourceGroup,
        location: resourceDetails.location,
      })
    );
  }, [dispatch, resourceDetails]);

  useEffect(() => {
    if (onResourceChange && logicAppId !== undefined) {
      onResourceChange();
    }
  }, [logicAppId, onResourceChange, resourceDetails]);

  return <DataProviderInner>{children}</DataProviderInner>;
};
