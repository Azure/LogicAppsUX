import type { ReactNode } from 'react';
import { loadSubscriptionIds, loadToken } from '../../../environments/environment';
import { SettingsBox } from '../../components/settings_box';
import { useHostingPlan, useIsLocal, useQueryCachePersist, useResourcePath } from '../../state/workflowLoadingSelectors';
import LogicAppsDesignerStandard from '../AzureLogicAppsDesigner/laDesigner';
import LogicAppsDesignerConsumption from '../AzureLogicAppsDesigner/laDesignerConsumption';
import { LocalDesigner } from '../LocalDesigner/localDesigner';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { useStandaloneStandardManagement } from './useStandaloneStandardManagement';
import { StandaloneStandardManagementProvider } from './StandaloneStandardManagementProvider';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  useQuery(['subcriptionIds'], loadSubscriptionIds);
  return isLoading ? null : <>{children}</>;
};
export const DesignerWrapper = () => {
  const resourcePath = useResourcePath();
  const isLocal = useIsLocal();
  const hostingPlan = useHostingPlan();
  const queryCachePersist = useQueryCachePersist();
  const { managementHost } = useStandaloneStandardManagement();

  return (
    <ReactQueryProvider persistEnabled={queryCachePersist}>
      <StandaloneStandardManagementProvider configuration={managementHost}>
        <LoadWhenArmTokenIsLoaded>
          <div style={{ height: '100vh' }}>
            <SettingsBox />
            {isLocal ? (
              <LocalDesigner />
            ) : resourcePath ? (
              hostingPlan === 'consumption' ? (
                <LogicAppsDesignerConsumption />
              ) : (
                <LogicAppsDesignerStandard managementHost={hostingPlan === 'standard' ? managementHost : undefined} />
              )
            ) : null}
          </div>
        </LoadWhenArmTokenIsLoaded>
      </StandaloneStandardManagementProvider>
    </ReactQueryProvider>
  );
};
