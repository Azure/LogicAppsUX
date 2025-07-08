import type React from 'react';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { initializeServices } from '../state/mcp/mcpOptions/mcpOptionsSlice';
import { useAreServicesInitialized } from '../state/mcp/mcpOptions/mcpOptionsSelector';
import { setInitialData, type ResourceState } from '../state/mcp/resourceSlice';
import type { AppDispatch } from '../state/mcp/store';
import type { ServiceOptions } from '../state/mcp/mcpOptions/mcpOptionsInterface';

export interface McpDataProviderProps {
  resourceDetails: ResourceState;
  services?: ServiceOptions;
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>;
};

export const McpDataProvider = ({ resourceDetails, services, children }: McpDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const servicesInitialized = useAreServicesInitialized();

  // Prefer props.services if provided; fallback to context
  useEffect(() => {
    if (!servicesInitialized && services) {
      dispatch(initializeServices(services));
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

  if (!servicesInitialized) {
    return null;
  }

  return <DataProviderInner>{children}</DataProviderInner>;
};
