import { SettingsBox } from '../../components/settings_box';
import type { RootState } from '../../state/store';
import { useFetchStandardApps } from '../AzureLogicAppsDesigner/Queries/FetchStandardApps';
import LogicAppsDesigner from '../AzureLogicAppsDesigner/laDesigner';
import { LocalDesigner } from '../LocalDesigner/localDesigner';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useSelector } from 'react-redux';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

const InnerDesigner = () => {
  const { data, isLoading } = useFetchStandardApps();
  const resourcePath = useSelector((state: RootState) => state.workflowLoader.resourcePath);
  const useLocal = useSelector((state: RootState) => state.workflowLoader.isLocalSelected);
  const localOnly = !data;
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsBox local={localOnly} />
      {isLoading ? <div>Loading.....</div> : localOnly || useLocal ? <LocalDesigner /> : resourcePath ? <LogicAppsDesigner /> : null}
    </QueryClientProvider>
  );
};

export const DesignerWrapper = () => {
  return (
    <ReactQueryProvider>
      <InnerDesigner />
    </ReactQueryProvider>
  );
};
