import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/mcp/store';
import { setInitialData } from '../state/mcp/resourceSlice';
import { initializeMcpData } from '../actions/bjsworkflow/mcp';
import type { McpDataProviderProps } from './McpDataProvider';
import { setDarkMode } from '../state/mcp/mcpOptions/mcpOptionsSlice';

export const McpServerDataProvider = ({
  resourceDetails,
  services,
  children,
  isDarkMode,
}: McpDataProviderProps & { isDarkMode: boolean }) => {
  const dispatch = useDispatch<AppDispatch>();

  const { servicesInitialized } = useSelector((state: RootState) => ({
    servicesInitialized: state.mcpOptions.servicesInitialized,
  }));

  useEffect(() => {
    if (!servicesInitialized && services) {
      dispatch(initializeMcpData({ services, logicAppName: resourceDetails.logicAppName }));
    }
  }, [dispatch, servicesInitialized, services, resourceDetails.logicAppName]);

  useEffect(() => {
    dispatch(
      setInitialData({
        subscriptionId: resourceDetails.subscriptionId,
        resourceGroup: resourceDetails.resourceGroup,
        location: resourceDetails.location,
        logicAppName: resourceDetails.logicAppName,
      })
    );
  }, [dispatch, resourceDetails]);

  useEffect(() => {
    if (isDarkMode !== undefined) {
      dispatch(setDarkMode(isDarkMode));
    }
  }, [dispatch, isDarkMode]);

  return <>{children}</>;
};
