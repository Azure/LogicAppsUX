import type React from 'react';
import { useContext, useEffect } from 'react';
import type { ResourceDetails } from '../state/mcp/workflowSlice';
import { McpWrappedContext } from './McpWizardContext';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../state/mcp/store';
import { setInitialData } from '../state/mcp/workflowSlice';
import type { ConnectionReferences } from '../../common/models/workflow';

export interface McpDataProviderProps {
  resourceDetails: ResourceDetails; //TODO: set up the mcp store and store this.
  // services: any;  // TODO
  connectionReferences: ConnectionReferences;
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: McpDataProviderProps) => {
  return <>{children}</>;
};

export const McpDataProvider = (props: McpDataProviderProps) => {
  const wrapped = useContext(McpWrappedContext);
  const dispatch = useDispatch<AppDispatch>();
  const { resourceDetails, connectionReferences } = props;

  if (!wrapped) {
    throw new Error('McpDataProvider must be used inside of a McpWrappedContext');
  }

  // TODO: initialize services in useEffect
  //  then, uncomment below
  // if (!servicesInitialized) {
  //   return null;
  // }
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
