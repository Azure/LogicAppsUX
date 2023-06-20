import { SettingsBox } from '../../components/settings_box';
import { useIsConsumption, useIsLocal, useResourcePath } from '../../state/workflowLoadingSelectors';
import LogicAppsDesignerStandard from '../AzureLogicAppsDesigner/laDesigner';
import LogicAppsDesignerConsumption from '../AzureLogicAppsDesigner/laDesignerConsumption';
import { LocalDesigner } from '../LocalDesigner/localDesigner';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const InnerDesigner = () => {
  const resourcePath = useResourcePath();
  const isLocal = useIsLocal();
  const isConsumption = useIsConsumption();

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsBox />
      {isLocal ? <LocalDesigner /> : resourcePath ? isConsumption ? <LogicAppsDesignerConsumption /> : <LogicAppsDesignerStandard /> : null}
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
