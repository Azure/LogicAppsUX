import type { RootState } from '../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { TemplateCard } from './cards/templateCard';
import { TemplatePanel } from '../panel/templatePanel/templatePanel';
import type { Template, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { TemplateFilters } from './filters/templateFilters';

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
      <div>
        <TemplateFilters
          connectors={[
            {
              value: 'connector1',
              displayName: 'Connector 1',
            },
            {
              value: 'connector2',
              displayName: 'Connector 2',
            },
          ]}
          triggers={[
            {
              value: 'trigger1',
              displayName: 'Trigger 1',
            },
            {
              value: 'trigger2',
              displayName: 'Trigger 2',
            },
          ]}
          filters={{
            Filter1: [
              {
                value: 'filter1',
                displayName: 'Filter 1',
              },
              {
                value: 'filter2',
                displayName: 'Filter 2',
              },
            ],
            Filter2: [
              {
                value: 'filter3',
                displayName: 'Filter 3',
              },
              {
                value: 'filter4',
                displayName: 'Filter 4',
              },
            ],
          }}
        />
      </div>
      <TemplatePanel onCreateClick={onCreateClick} />
      <div className="msla-templates-list">
        {availableTemplatesNames?.map((templateName: string) => (
          <TemplateCard key={templateName} templateName={templateName} />
        ))}
      </div>
    </>
  );
};
