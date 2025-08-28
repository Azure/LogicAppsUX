import { CloneDataProvider, CloneWizard, CloneWizardProvider } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/store';
import { useSelector } from 'react-redux';
import { useMcpStandardStyles } from './styles';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { cloneConsumptionToStandard } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { useCallback, useMemo } from 'react';
import { BaseCloneService, BaseResourceService } from '@microsoft/logic-apps-shared';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';

export const CloneToStandard = () => {
  const styles = useMcpStandardStyles();
  const { resourcePath: workflowId, theme } = useSelector((state: RootState) => state.workflowLoader);

  const resourceDetails = new ArmParser(workflowId ?? '');

  const onCloneCall = useCallback(
    async (
      sourceApps: { subscriptionId: string; resourceGroup: string; logicAppName: string; targetWorkflowName: string }[],
      destinationApp: { subscriptionId: string; resourceGroup: string; logicAppName: string }
    ) => {
      console.log('TODO: on submit', sourceApps, destinationApp);
      await cloneConsumptionToStandard(sourceApps, destinationApp);
    },
    []
  );

  const onClose = useCallback(() => {
    console.log('Close button clicked');
  }, []);

  const services = useMemo(() => getServices(), []);

  return (
    <CloneWizardProvider locale="en-US" theme={theme}>
      <div
        style={{
          margin: '20px',
        }}
      >
        <CloneDataProvider
          resourceDetails={{
            subscriptionId: resourceDetails.subscriptionId,
            resourceGroup: resourceDetails.resourceGroup,
            logicAppName: resourceDetails.resourceName,
          }}
          services={services}
        >
          <CloneWizard onCloneCall={onCloneCall} onClose={onClose} />
          <div id="mcp-layer-host" className={styles.layerHost} />
        </CloneDataProvider>
      </div>
    </CloneWizardProvider>
  );
};

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const getServices = (): any => {
  const armUrl = 'https://management.azure.com';

  const resourceService = new BaseResourceService({ baseUrl: armUrl, httpClient, apiVersion });
  const cloneService = new BaseCloneService({
    baseUrl: armUrl,
    httpClient,
    apiVersions: {
      gateway: '2018-11-01',
    },
  });

  return {
    resourceService,
    cloneService,
  };
};
