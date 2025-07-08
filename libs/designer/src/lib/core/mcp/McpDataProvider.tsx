import type React from 'react';
import { useContext, useEffect } from 'react';
import { McpWrappedContext } from './McpWizardContext';
import { useDispatch } from 'react-redux';
import { setInitialData } from '../state/mcp/workflowSlice';
import type { ConnectionReferences } from '../../common/models/workflow';
import { initializeServices } from '../state/mcp/mcpOptions/mcpOptionsSlice';
import { useAreServicesInitialized } from '../state/mcp/mcpOptions/mcpOptionsSelector';
import type { ResourceState } from '../state/mcp/resourceSlice';
import type { AppDispatch } from '../state/mcp/store';

export interface McpDataProviderProps {
  resourceDetails: ResourceState;
  connectionReferences: ConnectionReferences;
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: McpDataProviderProps) => {
  return <>{children}</>;
};

export const McpDataProvider = (props: McpDataProviderProps) => {
  const wrapped = useContext(McpWrappedContext);
  const dispatch = useDispatch<AppDispatch>();
  const servicesInitialized = useAreServicesInitialized();
  const { resourceDetails, connectionReferences } = props;

  if (!wrapped) {
    throw new Error('McpDataProvider must be used inside of a McpWrappedContext');
  }

  useEffect(() => {
    if (!servicesInitialized) {
      dispatch(initializeServices(wrapped));
    }
  }, [dispatch, servicesInitialized, wrapped]);

  //TODO: add useEffect for onResourceChange

  useEffect(() => {
    dispatch(
      setInitialData({
        subscriptionId: resourceDetails.subscriptionId,
        resourceGroup: resourceDetails.resourceGroup,
        location: resourceDetails.location,
        references: connectionReferences,
      })
    );
  }, [connectionReferences, dispatch, resourceDetails]);

  return <DataProviderInner {...props} />;
};
