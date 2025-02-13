import type { ReactNode } from 'react';
import { loadToken } from '../../../environments/environment';
import { SettingsBox } from '../../components/settings_box';
import { useHostingPlan, useIsLocal, useQueryCachePersist, useResourcePath } from '../../state/workflowLoadingSelectors';
import LogicAppsDesignerStandard from '../AzureLogicAppsDesigner/laDesigner';
import LogicAppsDesignerConsumption from '../AzureLogicAppsDesigner/laDesignerConsumption';
import { LocalDesigner } from '../LocalDesigner/localDesigner';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
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
