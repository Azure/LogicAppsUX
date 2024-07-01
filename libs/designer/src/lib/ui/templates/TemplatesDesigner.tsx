import type { RootState } from '../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { TemplateCard } from './cards/templateCard';
import { TemplatePanel } from '../panel/templatePanel/templatePanel';
import type { Template, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ConnectionMapping } from '../../core/state/templates/workflowSlice';

export const TemplatesDesigner = ({
  createWorkflowCall,
}: {
  createWorkflowCall: (
    workflowName: string,
    workflowKind: string,
    workflow: LogicAppsV2.WorkflowDefinition,
    connectionsMapping: ConnectionMapping,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => Promise<void>;
}) => {
  const { existingWorkflowName, connections } = useSelector((state: RootState) => state.workflow);
  const {
    workflowName,
    kind,
    workflowDefinition,
    parameterDefinitions,
    errors: { workflow: workflowError, kind: kindError, parameters: parametersError },
  } = useSelector((state: RootState) => state.template);
  const filteredTemplateNames = useSelector((state: RootState) => state.manifest.filteredTemplateNames);

  const onCreateClick = async () => {
    const workflowNameToUse = existingWorkflowName ?? workflowName;
    if (
      !workflowNameToUse ||
      workflowError ||
      !kind ||
      kindError ||
      !workflowDefinition ||
      Object.values(parametersError)?.filter((error) => error).length > 0
    ) {
      // TODO: Show error message
      console.log('Error checking conditions before calling createWorkflowCall');
      return;
    }
    await createWorkflowCall(workflowNameToUse, kind, workflowDefinition, connections, parameterDefinitions);
  };

  return (
    <>
      <TemplatePanel onCreateClick={onCreateClick} />
      <div className="msla-templates-list">
        {filteredTemplateNames?.map((templateName: string) => (
          <TemplateCard key={templateName} templateName={templateName} />
        ))}
      </div>
    </>
  );
};
