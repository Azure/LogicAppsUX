import { SettingsBox } from '../../components/settings_box';
import { useIsConsumption, useIsLocal, useResourcePath } from '../../state/workflowLoadingSelectors';
import LogicAppsDesignerStandard from '../AzureLogicAppsDesigner/laDesigner';
import LogicAppsDesignerConsumption from '../AzureLogicAppsDesigner/laDesignerConsumption';
import { LocalDesigner } from '../LocalDesigner/localDesigner';
import { QueryClient, QueryClientProvider } from 'react-query';

const standaloneQueryClient = new QueryClient({
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

export const DesignerWrapper = () => {
  const resourcePath = useResourcePath();
  const isLocal = useIsLocal();
  const isConsumption = useIsConsumption();

  return (
    <QueryClientProvider client={standaloneQueryClient}>
      <SettingsBox />
      {isLocal ? <LocalDesigner /> : resourcePath ? isConsumption ? <LogicAppsDesignerConsumption /> : <LogicAppsDesignerStandard /> : null}
    </QueryClientProvider>
  );
};
