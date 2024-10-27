import type { AppDispatch, RootState } from '../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { BlankWorkflowTemplateCard, TemplateCard } from './cards/templateCard';
import { TemplatePanel } from '../panel/templatePanel/templatePanel';
import { EmptySearch, Pager } from '@microsoft/designer-ui';
import { Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { TemplateFilters } from './filters/templateFilters';
import { useEffect } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import type { TemplatesDesignerProps } from './TemplatesDesigner';
import { setPageNum, templatesCountPerPage } from '../../core/state/templates/manifestSlice';

export const TemplatesList = ({ detailFilters, createWorkflowCall }: TemplatesDesignerProps) => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const { templateName, workflows } = useSelector((state: RootState) => state.template);
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
            <BlankWorkflowTemplateCard />
            {filteredTemplateNames.slice(startingIndex, endingIndex).map((templateName: string) => (
              <TemplateCard key={templateName} templateName={templateName} />
            ))}
          </div>
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

      {templateName === undefined || Object.keys(workflows).length !== 1 ? null : (
        <TemplatePanel showCreate={true} workflowId={Object.keys(workflows)[0]} createWorkflow={createWorkflowCall} />
      )}

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
