import type { ReactNode } from 'react';
import { loadSubscriptionIds, loadToken } from '../../../environments/environment';
import { SettingsBox } from '../../components/settings_box';
import { useHostingPlan, useIsLocal, useQueryCachePersist, useResourcePath } from '../../state/workflowLoadingSelectors';
import LogicAppsDesignerStandard from '../AzureLogicAppsDesigner/laDesignerV2';
import LogicAppsDesignerConsumption from '../AzureLogicAppsDesigner/laDesignerConsumptionV2';
import { LocalDesigner } from '../LocalDesigner/localDesignerV2';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer-v2';
import { useQuery } from '@tanstack/react-query';

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

  return (
    <ReactQueryProvider persistEnabled={queryCachePersist}>
      <LoadWhenArmTokenIsLoaded>
        <div style={{ height: '100vh' }}>
          <SettingsBox />
          {isLocal ? (
            <LocalDesigner />
          ) : resourcePath ? (
            hostingPlan === 'consumption' ? (
              <LogicAppsDesignerConsumption />
            ) : (
              <LogicAppsDesignerStandard />
            )
          ) : null}
        </div>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
