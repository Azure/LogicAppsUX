import type { ReactNode } from 'react';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { DevToolbox } from '../components/DevToolbox';
import { TemplatesStandard } from './TemplatesStandard';
import { useHostingPlan, useIsLocal } from '../../designer/state/workflowLoadingSelectors';
import { loadToken } from '../../environments/environment';
import { LocalTemplates } from './LocalTemplates';
import { TemplatesConsumption } from './TemplatesConsumption';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const TemplatesWrapper = () => {
  const isLocal = useIsLocal();
  const hostingPlan = useHostingPlan();
  const templateOptions = isLocal
    ? [
        { key: 'BasicWorkflowOnly', text: 'Basic Workflow' },
        { key: 'SimpleParametersOnly', text: 'Simple Parameters' },
      ]
    : [
        { key: 'sync-business-partner-sap-sharepoint-odata', text: 'SAP and Sharepoint' },
        { key: 'receive-request-send-response', text: 'Request Response' },
      ];

  if (!isLocal && hostingPlan !== 'consumption') {
    templateOptions.push({ key: 'accelerator-index-retrieve-ai-sharepoint-aisearch', text: 'AI Sharepoint Accelerator' });
  }
  return (
    <ReactQueryProvider>
      <LoadWhenArmTokenIsLoaded>
        <DevToolbox templatesList={templateOptions} />
        <div style={{ height: '100vh' }}>
          {isLocal ? <LocalTemplates /> : hostingPlan === 'consumption' ? <TemplatesConsumption /> : <TemplatesStandard />}
        </div>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
