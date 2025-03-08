import type { AppDispatch, RootState } from '../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { BlankWorkflowTemplateCard, TemplateCard } from './cards/templateCard';
import { EmptySearch, Pager } from '@microsoft/designer-ui';
import { TemplateFilters } from './filters/templateFilters';
import { useEffect } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import { Text } from '@fluentui/react-components';
import type { CreateWorkflowHandler, TemplatesDesignerProps } from './TemplatesDesigner';
import { setPageNum, templatesCountPerPage } from '../../core/state/templates/manifestSlice';
import { QuickViewPanel } from '../panel/templatePanel/quickViewPanel/quickViewPanel';
import { CreateWorkflowPanel } from '../panel/templatePanel/createWorkflowPanel/createWorkflowPanel';
import { initializeWorkflowMetadata } from '../../core/actions/bjsworkflow/templates';
import { useIntl } from 'react-intl';

export const TemplatesList = ({ detailFilters, createWorkflowCall, isWorkflowEmpty = true }: TemplatesDesignerProps) => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const { manifest } = useSelector((state: RootState) => state.template);
  const {
    filteredTemplateNames,
    filters: { pageNum, detailFilters: appliedDetailFilters },
  } = useSelector((state: RootState) => state.manifest);

  useEffect(() => {
    if (manifest) {
      dispatch(initializeWorkflowMetadata());
    }
  }, [dispatch, manifest]);

  const selectedTabId = appliedDetailFilters?.Type?.[0]?.value;

  const startingIndex = pageNum * templatesCountPerPage;
  const endingIndex = startingIndex + templatesCountPerPage;
  const lastPage = Math.ceil((filteredTemplateNames?.length ?? 0) / templatesCountPerPage);

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

  return (
    <>
      <TemplateFilters detailFilters={detailFilters} />
      <br />

      <div>
        <div className="msla-templates-list">
          {selectedTabId !== 'Accelerator' && <BlankWorkflowTemplateCard isWorkflowEmpty={isWorkflowEmpty} />}
          {filteredTemplateNames === undefined ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <TemplateCard key={i} templateName={''} />
              ))}
            </>
          ) : filteredTemplateNames?.length > 0 ? (
            <>
              {filteredTemplateNames.slice(startingIndex, endingIndex).map((templateName: string) => (
                <TemplateCard key={templateName} templateName={templateName} />
              ))}
            </>
          ) : null}
        </div>
        {filteredTemplateNames?.length && filteredTemplateNames.length > 0 ? (
          <Pager
            current={pageNum + 1}
            max={lastPage}
            min={1}
            readonlyPagerInput={true}
            clickablePageNumbers={5}
            countToDisplay={{
              countPerPage: templatesCountPerPage,
              totalCount: filteredTemplateNames.length,
            }}
            onChange={(page) => dispatch(setPageNum(page.value - 1))}
          />
        ) : null}
      </div>
      {filteredTemplateNames?.length === 0 ? (
        <div className="msla-templates-empty-list">
          <EmptySearch />
          <Text size={500} weight="semibold" align="start" className="msla-template-empty-list-title">
            {intlText.NO_RESULTS}
          </Text>
          <Text>{intlText.TRY_DIFFERENT}</Text>
        </div>
      ) : null}
      <WorkflowView createWorkflowCall={createWorkflowCall} />
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

const WorkflowView = ({ createWorkflowCall }: { createWorkflowCall: CreateWorkflowHandler }) => {
  const { templateName, workflows } = useSelector((state: RootState) => state.template);

  return templateName === undefined || Object.keys(workflows).length !== 1 ? null : (
    <>
      <QuickViewPanel showCreate={true} workflowId={Object.keys(workflows)[0]} />
      <CreateWorkflowPanel createWorkflow={createWorkflowCall} />
    </>
  );
};
