import type React from 'react';
import { useContext } from 'react';
import type { ResourceDetails } from '../state/templates/workflowSlice';
import { McpWrappedContext } from './McpWizardContext';

export interface McpDataProviderProps {
  resourceDetails: ResourceDetails; //TODO: set up the mcp store and store this.
  // services: any;  // TODO
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: McpDataProviderProps) => {
  return <>{children}</>;
};

export const McpDataProvider = (props: McpDataProviderProps) => {
  const wrapped = useContext(McpWrappedContext);

  if (!wrapped) {
    throw new Error('McpDataProvider must be used inside of a McpWrappedContext');
  }

  // TODO: initialize services in useEffect
  //  then, uncomment below
  // if (!servicesInitialized) {
  //   return null;
  // }

  return <DataProviderInner {...props} />;
};
