import { DesignerProvider, BJSWorkflowProvider, Designer, WorkflowParameterView } from '@microsoft/logic-apps-designer';
import { SettingsBox } from '../../components/settings_box';

export interface DesignerWrapperProps {
  workflow: LogicAppsV2.WorkflowDefinition;
  setResourceId: (res: string) => void;
  setToken: (res: string) => void;
  token?: string | null;
  resourceId?: string | null;
}
export const DesignerWrapper = ({ workflow, setResourceId, setToken, resourceId, token }: DesignerWrapperProps) => {
  return (
    <>
      <SettingsBox setResourceId={setResourceId} setToken={setToken} resourceId={resourceId} token={token} />
      <WorkflowParameterView parameters={[{ id: 'joe' }]} />
      <DesignerProvider locale="en-US">
        <BJSWorkflowProvider workflow={workflow}>
          <Designer></Designer>
        </BJSWorkflowProvider>
      </DesignerProvider>
    </>
  );
};
