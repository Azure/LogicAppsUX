import type { AppDispatch, RootState } from '../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { TemplateCard } from './cards/templateCard';
import { TemplatePanel } from '../panel/templatePanel/templatePanel';
import type { Template, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ConnectionMapping } from '../../core/state/templates/workflowSlice';
import { EmptySearch, Pager } from '@microsoft/designer-ui';
import { Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { TemplateFilters, type TemplateDetailFilterType } from './filters/templateFilters';
import { useEffect } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import { setPageNum, templatesCountPerPage } from '../../core/state/templates/manifestSlice';

export const TemplatesDesigner = ({
  detailFilters,
  createWorkflowCall,
}: {
  detailFilters: TemplateDetailFilterType;
  createWorkflowCall: (
    workflowName: string | undefined,
    workflowKind: string | undefined,
    workflow: LogicAppsV2.WorkflowDefinition,
    connectionsMapping: ConnectionMapping,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => Promise<void>;
}) => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { existingWorkflowName, connections, isConsumption } = useSelector((state: RootState) => state.workflow);
  const {
    workflowName,
    kind,
    workflowDefinition,
    parameterDefinitions,
    errors: { workflow: workflowError, kind: kindError, parameters: parametersError, connections: connectionsError },
  } = useSelector((state: RootState) => state.template);
  const {
    filteredTemplateNames,
    filters: { pageNum },
  } = useSelector((state: RootState) => state.manifest);

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
    MISSING_INFO_ERROR: intl.formatMessage({
      defaultMessage: 'Missing information for workflow creation',
      id: 'wBBu4g',
      description: 'Error message when missing information for workflow creation',
    }),
  };

  const onCreateClick = async () => {
    const workflowNameToUse = existingWorkflowName ?? workflowName;
    const isMissingInfoForStandard = !workflowNameToUse || !kind || kindError;

    const isMissingInfo =
      (!isConsumption && isMissingInfoForStandard) ||
      workflowError ||
      !workflowDefinition ||
      connectionsError ||
      Object.values(parametersError)?.filter((error) => error).length > 0;

    if (isMissingInfo) {
      throw new Error(intlText.MISSING_INFO_ERROR);
    }

    await createWorkflowCall(workflowNameToUse, kind, workflowDefinition, connections, parameterDefinitions);
  };

  const startingIndex = pageNum * templatesCountPerPage;
  const endingIndex = startingIndex + templatesCountPerPage;
  const lastPage = Math.ceil((filteredTemplateNames?.length ?? 0) / templatesCountPerPage);

  return (
    <>
      <TemplateFilters detailFilters={detailFilters} />
      <br />
      {filteredTemplateNames && filteredTemplateNames?.length > 0 ? (
        <div>
          <div className="msla-templates-list">
            {filteredTemplateNames.slice(startingIndex, endingIndex).map((templateName: string) => (
              <TemplateCard key={templateName} templateName={templateName} />
            ))}
          </div>
          <Pager
            current={pageNum + 1}
            max={lastPage}
            min={1}
            readonlyPagerInput={true}
            showPageNumbers={true}
            onChange={(page) => dispatch(setPageNum(page.value - 1))}
          />
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

      <TemplatePanel onCreateClick={onCreateClick} />

      <div
        id={'msla-layer-host'}
        style={{
          position: 'absolute',
          inset: '0px',
          visibility: 'hidden',
        }}
      />
    </>
  );
};
