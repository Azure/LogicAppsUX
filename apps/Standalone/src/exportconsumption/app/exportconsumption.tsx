import { ExportDataProvider, ExportWizard, ExportWizardProvider } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/store';
import { useSelector } from 'react-redux';
import { useMcpStandardStyles } from './styles';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { useWorkflowAndArtifactsConsumption } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import { useCallback } from 'react';

export const ExportConsumption = () => {
  const styles = useMcpStandardStyles();
  const { resourcePath: workflowId, theme } = useSelector((state: RootState) => state.workflowLoader);
  const { data: workflowData } = useWorkflowAndArtifactsConsumption(workflowId!);
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowData?.location ?? 'westus');

  const resourceDetails = new ArmParser(workflowId ?? '');

  //TODO: props passed in will be defined to be defined later on api integration
  const onExportCall = useCallback(async () => {
    console.log('TODO: on submit');
  }, []);

  const onClose = useCallback(() => {
    console.log('Close button clicked');
  }, []);

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
                <ExportWizard onExportCall={onExportCall} onClose={onClose} />
                <div id="mcp-layer-host" className={styles.layerHost} />
              </ExportDataProvider>
            </div>
          </div>
        </div>
      </div>
    </ExportWizardProvider>
  );
};
