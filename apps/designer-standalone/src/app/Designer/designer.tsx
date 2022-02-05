import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { SettingsBox } from '../../components/settings_box';
import workflow from '../../../../../__mocks__/workflows/simpleBigworkflow.json';
export interface DesignerWrapperProps {
  workflow: LogicAppsV2.WorkflowDefinition;
  setResourceId: (res: string) => void;
  setToken: (res: string) => void;
  token?: string | null;
  resourceId?: string | null;
}
export const DesignerWrapper = ({ setResourceId, setToken, resourceId, token }: DesignerWrapperProps) => {
  return (
    <>
      <SettingsBox setResourceId={setResourceId} setToken={setToken} resourceId={resourceId} token={token} />
      <DesignerProvider locale="en-US">
        <BJSWorkflowProvider workflow={workflow.definition}>
          <Designer></Designer>
        </BJSWorkflowProvider>
      </DesignerProvider>
    </>
  );
};
