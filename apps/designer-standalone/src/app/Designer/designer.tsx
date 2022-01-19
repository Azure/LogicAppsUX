import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { SettingsBox } from '../../components/settings_box';
import { ParameterButton } from '../../components/workflowparameters/parameter_button';
import { createRef } from 'react';
import { WorkflowParameterDefinition } from '../../../../../libs/designer/src/lib/ui/workflowparameters/_workflowparameter';
import { WorkflowParametersPanel } from '../../../../../libs/designer/src/lib/ui/workflowparameters';

export interface DesignerWrapperProps {
  workflow: LogicAppsV2.WorkflowDefinition;
  setResourceId: (res: string) => void;
  setToken: (res: string) => void;
  token?: string | null;
  resourceId?: string | null;
}
export const DesignerWrapper = ({ workflow, setResourceId, setToken, resourceId, token }: DesignerWrapperProps) => {
  const _panelRef = createRef<WorkflowParametersPanel>();

  return (
    <>
      <SettingsBox setResourceId={setResourceId} setToken={setToken} resourceId={resourceId} token={token} />
      <ParameterButton toggleOpen={() => _panelRef.current?.showPanel()} />
      <WorkflowParametersPanel ref={_panelRef} onDismiss={() => console.log('dismissed panel')} parameters={createWorkflowDefintions()} />
      <DesignerProvider locale="en-US">
        <BJSWorkflowProvider workflow={workflow}>
          <Designer></Designer>
        </BJSWorkflowProvider>
      </DesignerProvider>
    </>
  );
};
function createWorkflowDefintions(): WorkflowParameterDefinition[] {
  return [
    { defaultValue: '{}', id: 'test', name: 'test', type: 'SecureObject' },
    { defaultValue: 'test2', id: 'test2', name: 'Hello', type: 'Bool' },
  ];
}
