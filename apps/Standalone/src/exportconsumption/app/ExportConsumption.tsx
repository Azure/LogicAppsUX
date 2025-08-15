import { useMemo } from 'react';
import { McpWizardProvider, ExportConsumptionProvider } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { useSelector } from 'react-redux';
import { useMcpStandardStyles } from './styles';

export const ExportConsumption = () => {
  const styles = useMcpStandardStyles();
  const { theme } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
  }));

  const resourceDetails = useMemo(
    () => ({
      subscriptionId: 'f34b22a3-2202-4fb1-b040-1332bd928c84',
      resourceGroup: 'TestACSRG',
      location: 'westus',
    }),
    []
  );

  //TODO: pass onto ExportConsumptionWizard
  // const onExportCall = useCallback(async (createData: McpServerCreateData, onCompleted?: () => void) => {
  //   onCompleted?.();
  // }, []);

  //TODO: pass onto ExportConsumptionWizard
  // const onClose = useCallback(() => {
  //   console.log('Close button clicked');
  // }, []);

  return (
    <McpWizardProvider locale="en-US" theme={theme}>
      <div className={`${styles.container} ${styles.fadeIn}`}>
        <div className={styles.wizardContainer}>
          <div className={styles.wizardContent}>
            <div className={styles.wizardWrapper}>
              <ExportConsumptionProvider resourceDetails={resourceDetails}>
                {/* ExportConsumptionWizard */}
                <div id="mcp-layer-host" className={styles.layerHost} />
              </ExportConsumptionProvider>
            </div>
          </div>
        </div>
      </div>
    </McpWizardProvider>
  );
};

// const getWorkflowAppIdFromStore = () => {
//   const { subscriptionId, resourceGroup, logicAppName } = mcpStore.getState().resource;
//   return subscriptionId && resourceGroup && logicAppName
//     ? `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${logicAppName}`
//     : '';
// };
