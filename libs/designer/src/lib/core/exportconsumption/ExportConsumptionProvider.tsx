import type React from 'react';
import { useEffect } from 'react';
import type { ResourceState } from '../state/mcp/resourceSlice';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../state/mcp/store';
import { setInitialData } from '../state/mcp/resourceSlice';

export interface McpDataProviderProps {
  resourceDetails: ResourceState;
  children?: React.ReactNode;
}

const DataProviderInner = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>;
};

export const ExportConsumptionProvider = ({ resourceDetails, children }: McpDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();

  // const { logicAppName } = useSelector((state: RootState) => ({
  //   logicAppName: state.resource.logicAppName,
  //   servicesInitialized: state.mcpOptions.servicesInitialized,
  // }));

  useEffect(() => {
    dispatch(
      setInitialData({
        subscriptionId: resourceDetails.subscriptionId,
        resourceGroup: resourceDetails.resourceGroup,
        location: resourceDetails.location,
        // logicAppName: logicAppName //TODO: do this
      })
    );
  }, [dispatch, resourceDetails]);

  return <DataProviderInner>{children}</DataProviderInner>;
};
