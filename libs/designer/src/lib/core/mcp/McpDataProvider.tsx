import type React from 'react';
import { useContext, useEffect } from 'react';
import type { ResourceState } from '../state/mcp/resourceSlice';
import { McpWrappedContext } from './McpWizardContext';
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

const DataProviderInner = ({ children }: McpDataProviderProps) => {
  return <>{children}</>;
};

export const McpDataProvider = (props: McpDataProviderProps) => {
  const wrapped = useContext(McpWrappedContext);
  const dispatch = useDispatch<AppDispatch>();
  const { resourceDetails, services, onResourceChange } = props;

  const { logicAppId, servicesInitialized } = useSelector((state: RootState) => ({
    logicAppId: state.resource.logicAppId,
    servicesInitialized: state.mcpOptions.servicesInitialized,
  }));

  useEffect(() => {
    if (!servicesInitialized) {
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

  if (!wrapped) {
    throw new Error('McpDataProvider must be used inside of a McpWrappedContext');
  }

  if (!servicesInitialized) {
    return null;
  }

  return <DataProviderInner {...props} />;
};
