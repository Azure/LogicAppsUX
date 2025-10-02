import type React from 'react';
import { useEffect } from 'react';
import type { ResourceState } from '../state/mcp/resourceSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/mcp/store';
import { setInitialData } from '../state/mcp/resourceSlice';
import { initializeMcpData, type McpServiceOptions } from '../actions/bjsworkflow/mcp';

export interface McpDataProviderProps {
  connectorId?: string;
  resourceDetails: ResourceState;
  services: McpServiceOptions;
  onResourceChange?: () => void;
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>;
};

export const McpDataProvider = ({ connectorId, resourceDetails, services, onResourceChange, children }: McpDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const { logicAppName, servicesInitialized } = useSelector((state: RootState) => ({
    logicAppName: state.resource.logicAppName,
    servicesInitialized: state.mcpOptions.servicesInitialized,
  }));

  useEffect(() => {
    if (!servicesInitialized && services) {
      dispatch(initializeMcpData({ services, connectorId }));
    }
  }, [dispatch, servicesInitialized, services, connectorId]);

  useEffect(() => {
    dispatch(
      setInitialData({
        subscriptionId: resourceDetails.subscriptionId,
        resourceGroup: resourceDetails.resourceGroup,
        location: resourceDetails.location,
        logicAppName: resourceDetails.logicAppName,
        connectorId,
      })
    );
  }, [connectorId, dispatch, resourceDetails]);

  useEffect(() => {
    if (onResourceChange && logicAppName !== undefined) {
      onResourceChange();
    }
  }, [logicAppName, onResourceChange, resourceDetails]);

  return <DataProviderInner>{children}</DataProviderInner>;
};
