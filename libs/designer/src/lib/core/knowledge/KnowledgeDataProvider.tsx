import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/mcp/store';
import { setDarkMode } from '../state/mcp/mcpOptions/mcpOptionsSlice';
import { type KnowledgeServiceOptions, initializeServices } from '../actions/bjsworkflow/knowledge';

export interface KnowledgeDataProviderProps {
  appId: string;
  services: KnowledgeServiceOptions;
  children?: React.ReactNode;
  isDarkMode?: boolean;
}

export const KnowledgeDataProvider = ({
  services,
  children,
  isDarkMode,
}: KnowledgeDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { servicesInitialized } = useSelector((state: RootState) => ({
    servicesInitialized: state.mcpOptions.servicesInitialized,
  }));

  useEffect(() => {
    if (!servicesInitialized && services) {
      initializeServices(services);
    }
  }, [servicesInitialized, services]);

  useEffect(() => {
    if (isDarkMode !== undefined) {
      dispatch(setDarkMode(isDarkMode));
    }
  }, [dispatch, isDarkMode]);

  return <>{children}</>;
};
