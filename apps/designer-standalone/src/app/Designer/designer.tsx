import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { SettingsBox } from '../../components/settings_box';
import { ParameterButton } from '../../components/workflowparameters/parameter_button';
import { useState, useEffect } from 'react';

export interface DesignerWrapperProps {
  workflow: LogicAppsV2.WorkflowDefinition;
  setResourceId: (res: string) => void;
  setToken: (res: string) => void;
  token?: string | null;
  resourceId?: string | null;
}
export const DesignerWrapper = ({ workflow, setResourceId, setToken, resourceId, token }: DesignerWrapperProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect (() => {
    console.log(isOpen);
  }, [isOpen])
  return (
    <>
      <SettingsBox setResourceId={setResourceId} setToken={setToken} resourceId={resourceId} token={token} />
      <ParameterButton toggleOpen={setIsOpen} isOpen={isOpen}/>
      <DesignerProvider locale="en-US">
        <BJSWorkflowProvider workflow={workflow}>
          <Designer></Designer>
        </BJSWorkflowProvider>
      </DesignerProvider>
    </>
  );
};
