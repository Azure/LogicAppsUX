import { type ReactNode, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import type { AppDispatch } from '../../state/store';
import { loadWorkflow, setHostOptions, setHostingPlan, setIsLocalSelected, setResourcePath } from '../../state/workflowLoadingSlice';
import { loadSubscriptionIds, loadToken } from '../../../environments/environment';
import { SettingsBox } from '../../components/settings_box';
import { useHostingPlan, useIsLocal, useQueryCachePersist, useResourcePath } from '../../state/workflowLoadingSelectors';
import LogicAppsDesignerStandard from '../AzureLogicAppsDesigner/laDesignerV2';
import LogicAppsDesignerConsumption from '../AzureLogicAppsDesigner/laDesignerConsumptionV2';
import { LocalDesigner } from '../LocalDesigner/localDesignerV2';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer-v2';
import { useQuery } from '@tanstack/react-query';
import { getWorkflowExtractionRoute } from './workflowExtractionRoute';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  useQuery(['subcriptionIds'], loadSubscriptionIds);
  return isLoading ? null : <>{children}</>;
};
export const DesignerWrapper = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { search } = useLocation();
  const resourcePath = useResourcePath();
  const isLocal = useIsLocal();
  const hostingPlan = useHostingPlan();
  const queryCachePersist = useQueryCachePersist();
  useEffect(() => {
    const extractionRoute = getWorkflowExtractionRoute(search);
    dispatch(setHostOptions({ enableWorkflowExtraction: extractionRoute.enabled }));
    if (!extractionRoute.enabled) {
      return;
    }
    if (extractionRoute.localWorkflow) {
      dispatch(setHostingPlan('standard'));
      dispatch(setIsLocalSelected(true));
      dispatch(setResourcePath(extractionRoute.localWorkflow));
      dispatch(loadWorkflow(undefined));
    }
  }, [dispatch, search]);

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
