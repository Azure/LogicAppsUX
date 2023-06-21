import { SettingsBox } from '../../components/settings_box';
import { useIsConsumption, useIsLocal, useResourcePath } from '../../state/workflowLoadingSelectors';
import LogicAppsDesignerStandard from '../AzureLogicAppsDesigner/laDesigner';
import LogicAppsDesignerConsumption from '../AzureLogicAppsDesigner/laDesignerConsumption';
import { LocalDesigner } from '../LocalDesigner/localDesigner';
import { getReactQueryClient } from '@microsoft/logic-apps-designer';
import { QueryClientProvider } from 'react-query';

const standaloneQueryClient = getReactQueryClient();

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
