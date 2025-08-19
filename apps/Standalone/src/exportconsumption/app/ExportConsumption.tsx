import { ExportDataProvider, ExportWizardProvider } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { useSelector } from 'react-redux';
import { useMcpStandardStyles } from './styles';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { useWorkflowAndArtifactsConsumption } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';

export const ExportConsumption = () => {
  const styles = useMcpStandardStyles();
  const { resourcePath: workflowId, theme } = useSelector((state: RootState) => state.workflowLoader);
  const { data: workflowData } = useWorkflowAndArtifactsConsumption(workflowId!);
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowData?.location ?? 'westus');

  const resourceDetails = new ArmParser(workflowId ?? '');

  //TODO: pass onto ExportConsumptionWizard
  // const onExportCall = useCallback(async (createData: McpServerCreateData, onCompleted?: () => void) => {
  //   onCompleted?.();
  // }, []);

  //TODO: pass onto ExportConsumptionWizard
  // const onClose = useCallback(() => {
  //   console.log('Close button clicked');
  // }, []);

  return (
    <ExportWizardProvider locale="en-US" theme={theme}>
      <div className={`${styles.container} ${styles.fadeIn}`}>
        <div className={styles.wizardContainer}>
          <div className={styles.wizardContent}>
            <div className={styles.wizardWrapper}>
              <ExportDataProvider
                resourceDetails={{
                  subscriptionId: resourceDetails.subscriptionId,
                  resourceGroup: resourceDetails.resourceGroup,
                  logicAppName: resourceDetails.resourceName,
                  location: canonicalLocation,
                }}
              >
                {/* ExportConsumptionWizard */}
                <div id="mcp-layer-host" className={styles.layerHost} />
              </ExportDataProvider>
            </div>
          </div>
        </div>
      </div>
    </ExportWizardProvider>
  );
};

// const getWorkflowAppIdFromStore = () => {
//   const { subscriptionId, resourceGroup, logicAppName } = mcpStore.getState().resource;
//   return subscriptionId && resourceGroup && logicAppName
//     ? `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${logicAppName}`
//     : '';
// };
