import { useEffect, useMemo } from 'react';
import { McpDataProvider, McpWizard, McpWizardProvider } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { useSelector } from 'react-redux';
import { useConnectionsData, useWorkflowApp } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import { useFunctionalState } from '@react-hookz/web';
import { clone } from '@microsoft/logic-apps-shared';

export const McpStandard = () => {
  const { theme } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
  }));
  const { appId, hostingPlan } = useSelector((state: RootState) => state.workflowLoader);
  const { data: workflowAppData } = useWorkflowApp(appId as string, hostingPlan);
  const canonicalLocation = useMemo(
    () => WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? 'westus'),
    [workflowAppData]
  );
  const { data: originalConnectionsData } = useConnectionsData(appId);
  const [connectionsData, setConnectionsData] = useFunctionalState(originalConnectionsData);

  useEffect(() => {
    if (originalConnectionsData) {
      setConnectionsData(JSON.parse(JSON.stringify(clone(originalConnectionsData ?? {}))));
    }
  }, [originalConnectionsData, setConnectionsData]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const connectionReferences = useMemo(() => WorkflowUtility.convertConnectionsDataToReferences(connectionsData()), [connectionsData()]);

  const resourceDetails = new ArmParser(appId ?? '');

  if (!workflowAppData) {
    return null;
  }

  return (
    <McpWizardProvider locale="en-US" theme={theme}>
      <McpDataProvider
        resourceDetails={{
          subscriptionId: resourceDetails.subscriptionId,
          resourceGroup: resourceDetails.resourceGroup,
          location: canonicalLocation,
        }}
        connectionReferences={connectionReferences}
      >
        <div
          style={{
            margin: '20px',
          }}
        >
          <McpWizard
            onCreateCall={() => {
              console.log('MCP Create call is triggered.');
            }}
          />
        </div>
      </McpDataProvider>
    </McpWizardProvider>
  );
};
