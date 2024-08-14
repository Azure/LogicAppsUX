import type { RootState } from '../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { TemplateCard } from './cards/templateCard';
import { TemplatePanel } from '../panel/templatePanel/templatePanel';
import type { Template, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ConnectionMapping } from '../../core/state/templates/workflowSlice';
import { EmptySearch } from '@microsoft/designer-ui';
import { Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { TemplateFilters, type TemplateDetailFilterType } from './filters/templateFilters';

export const TemplatesDesigner = ({
  detailFilters,
  createWorkflowCall,
}: {
  detailFilters: TemplateDetailFilterType;
  createWorkflowCall: (
    workflowName: string,
    workflowKind: string,
    workflow: LogicAppsV2.WorkflowDefinition,
    connectionsMapping: ConnectionMapping,
    parametersData: Record<string, Template.ParameterDefinition>,
    onSuccessfulCreation: () => void
  ) => Promise<void>;
}) => {
  const intl = useIntl();
  const { existingWorkflowName, connections } = useSelector((state: RootState) => state.workflow);
  const {
    workflowName,
    kind,
    workflowDefinition,
    parameterDefinitions,
    errors: { workflow: workflowError, kind: kindError, parameters: parametersError, connections: connectionsError },
  } = useSelector((state: RootState) => state.template);
  const filteredTemplateNames = useSelector((state: RootState) => state.manifest.filteredTemplateNames);

  const intlText = {
    NO_RESULTS: intl.formatMessage({
      defaultMessage: "Can't find any search results",
      id: 'iCni1C',
      description: 'Accessbility text to indicate no search results found',
    }),
    TRY_DIFFERENT: intl.formatMessage({
      defaultMessage: 'Try a different search term or remove filters',
      id: 'yKNKV/',
      description: 'Accessbility text to indicate to try different search term or remove filters',
    }),
  };

  const onCreateClick = async (onSuccessfulCreation: () => void) => {
    const workflowNameToUse = existingWorkflowName ?? workflowName;
    if (
      !workflowNameToUse ||
      workflowError ||
      !kind ||
      kindError ||
      !workflowDefinition ||
      connectionsError ||
      Object.values(parametersError)?.filter((error) => error).length > 0
    ) {
      // TODO: Show error message
      console.log('Error checking conditions before calling createWorkflowCall');
      return;
    }
    await createWorkflowCall(workflowNameToUse, kind, workflowDefinition, connections, parameterDefinitions, onSuccessfulCreation);
  };

  return (
    <>
      <TemplateFilters detailFilters={detailFilters} />
      <br />
      <TemplatePanel onCreateClick={onCreateClick} />
      {filteredTemplateNames && filteredTemplateNames?.length > 0 ? (
        <div className="msla-templates-list">
          {filteredTemplateNames.map((templateName: string) => (
            <TemplateCard key={templateName} templateName={templateName} />
          ))}
        </div>
      ) : (
        <div className="msla-templates-empty-list">
          <EmptySearch />
          <Text size={500} weight="semibold" align="start" className="msla-template-empty-list-title">
            {intlText.NO_RESULTS}
          </Text>
          <Text>{intlText.TRY_DIFFERENT}</Text>
        </div>
      )}
    </>
  );
};
