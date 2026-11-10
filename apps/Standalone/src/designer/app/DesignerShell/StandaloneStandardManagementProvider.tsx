import { useEffect, type ReactNode } from 'react';
import { useAppId, useHostOptions, useHostingPlan, useIsLocal } from '../../state/workflowLoadingSelectors';
import { useWorkflowApp } from '../AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import {
  useAzureStandardManagement,
  type AzureStandardManagementHostConfiguration,
} from '../AzureLogicAppsDesigner/Services/StandardManagement';
import { StandaloneManagementContext } from './standaloneManagementContext';

export function StandaloneStandardManagementProvider({
  configuration,
  children,
}: {
  configuration?: AzureStandardManagementHostConfiguration;
  children: ReactNode;
}) {
  const appId = useAppId();
  const hostingPlan = useHostingPlan();
  const isLocal = useIsLocal();
  const { enableStandardDirectManagement } = useHostOptions();
  const enabled = !!enableStandardDirectManagement && hostingPlan === 'standard' && !isLocal;
  const { data: app, isError } = useWorkflowApp(appId ?? '', hostingPlan, !!configuration && enabled && !!appId);
  const runtimeHostName = app?.properties?.defaultHostName;
  const client = useAzureStandardManagement(
    { resourceId: appId ?? '', runtimeHostName, isHybrid: hostingPlan === 'hybrid' },
    enabled ? configuration : undefined
  );
  const discoveryFailed = enabled && !!configuration && (isError || (!!app && !runtimeHostName));
  useEffect(() => {
    if (discoveryFailed) {
      console.warn('Standard management runtime discovery failed; requests will use the original ARM route.');
    }
  }, [discoveryFailed]);
  return <StandaloneManagementContext.Provider value={{ client }}>{children}</StandaloneManagementContext.Provider>;
}
