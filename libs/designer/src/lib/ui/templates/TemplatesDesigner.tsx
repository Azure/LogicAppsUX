import type { RootState } from '../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { TemplateCard } from './cards/templateCard';
import { TemplatePanel } from '../panel/templatePanel/templatePanel';
import type { Template, LogicAppsV2 } from '@microsoft/logic-apps-shared';

export const TemplatesDesigner = ({
  createWorkflowCall,
}: {
  createWorkflowCall: (
    workflowName: string,
    workflowKind: string,
    workflow: LogicAppsV2.WorkflowDefinition,
    connectionsData: any,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => Promise<void>;
}) => {
  const { existingWorkflowName } = useSelector((state: RootState) => state.workflow);
  const { workflowName, kind, workflowDefinition, parameters } = useSelector((state: RootState) => state.template);
  const availableTemplatesNames = useSelector((state: RootState) => state.manifest.availableTemplateNames);

  const onCreateClick = async () => {
    const workflowNameToUse = existingWorkflowName ?? workflowName;
    if (
      !workflowNameToUse ||
      !kind ||
      !workflowDefinition ||
      Object.values(parameters.validationErrors)?.filter((error) => error).length > 0
    ) {
      // TODO: Show error message
      console.log('Error checking conditions before calling createWorkflowCall');
      return;
    }
    await createWorkflowCall(
      workflowNameToUse,
      kind,
      workflowDefinition,
      /*change this after connnections is done*/ null,
      parameters.definitions
    );
  };

  return (
    <>
      <TemplatePanel onCreateClick={onCreateClick} />
      {availableTemplatesNames?.map((templateName: string) => (
        <TemplateCard key={templateName} templateName={templateName} />
      ))}
    </>
  );
};
