import type { AppDispatch, RootState } from '../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { BlankWorkflowTemplateCard, TemplateCard } from './cards/templateCard';
import { Pager } from '@microsoft/designer-ui';
import { TemplateFilters, templateDefaultTabKey } from './filters/templateFilters';
import { useEffect } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import type { CreateWorkflowHandler, TemplatesDesignerProps } from './TemplatesDesigner';
import { setPageNum, templatesCountPerPage } from '../../core/state/templates/manifestSlice';
import { QuickViewPanel } from '../panel/templatePanel/quickViewPanel/quickViewPanel';
import { CreateWorkflowPanel } from '../panel/templatePanel/createWorkflowPanel/createWorkflowPanel';

export const TemplatesList = ({ detailFilters, createWorkflowCall }: TemplatesDesignerProps) => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const dispatch = useDispatch<AppDispatch>();

  const {
    filteredTemplateNames,
    filters: { pageNum, detailFilters: appliedDetailFilters },
  } = useSelector((state: RootState) => state.manifest);
  const selectedTabId = appliedDetailFilters?.Type?.[0]?.value;

  const startingIndex = pageNum * templatesCountPerPage;
  const endingIndex = startingIndex + templatesCountPerPage;
  const lastPage = Math.ceil((filteredTemplateNames?.length ?? 0) / templatesCountPerPage);

  return (
    <>
      <TemplateFilters detailFilters={detailFilters} />
      <br />

      <div>
        <div className="msla-templates-list">
        {selectedTabId === templateDefaultTabKey && <BlankWorkflowTemplateCard />}
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
        {filteredTemplateNames?.length && filteredTemplateNames.length > 0 && (
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
        )}
      </div>

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
