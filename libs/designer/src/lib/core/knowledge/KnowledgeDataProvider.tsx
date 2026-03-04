import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/knowledge/store';
import { setDarkMode } from '../state/knowledge/optionsSlice';
import { type KnowledgeServiceOptions, initializeData } from '../actions/bjsworkflow/knowledge';
import { type ResourceState, setInitialData } from '../state/mcp/resourceSlice';

export interface KnowledgeDataProviderProps {
  resourceDetails: ResourceState;
  services: KnowledgeServiceOptions;
  children?: React.ReactNode;
  isDarkMode?: boolean;
}

export const KnowledgeDataProvider = ({ services, children, isDarkMode, resourceDetails }: KnowledgeDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { servicesInitialized } = useSelector((state: RootState) => ({
    servicesInitialized: state.options.servicesInitialized,
  }));

  useEffect(() => {
    if (!servicesInitialized && services) {
      dispatch(initializeData(services));
    }
  }, [servicesInitialized, services, dispatch]);

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
