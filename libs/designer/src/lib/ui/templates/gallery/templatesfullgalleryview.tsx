import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { TemplateCard } from '../cards/templateCard';
import { useEffect, useMemo } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import type { CreateWorkflowHandler, TemplatesDesignerProps } from '../TemplatesDesigner';
import { QuickViewPanel } from '../../panel/templatePanel/quickViewPanel/quickViewPanel';
import { CreateWorkflowPanel } from '../../panel/templatePanel/createWorkflowPanel/createWorkflowPanel';
import { openPanelView, TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { TemplatesGalleryWithSearch } from './templatesgallerywithsearch';

const tabFilterKey = 'publishedBy';

export const TemplatesFullGalleryView = ({ detailFilters, createWorkflowCall, isWorkflowEmpty = true }: TemplatesDesignerProps) => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const dispatch = useDispatch<AppDispatch>();

  const {
    filters: { detailFilters: appliedDetailFilters },
  } = useSelector((state: RootState) => state.manifest);

  const blankTemplateCard = useMemo(() => {
    const selectedTabId = appliedDetailFilters?.[tabFilterKey]?.[0]?.value;
    return selectedTabId === undefined ? <TemplateCard blankWorkflowProps={{ isWorkflowEmpty }} templateName="#blank#" /> : undefined;
  }, [appliedDetailFilters, isWorkflowEmpty]);
  const onTemplateSelect = (_templateName: string, isSingleWorkflow: boolean) => {
    if (isSingleWorkflow) {
      dispatch(openPanelView({ panelView: TemplatePanelView.QuickView }));
    }
  };

  return (
    <>
      <TemplatesGalleryWithSearch
        searchAndFilterProps={{ detailFilters, tabFilterKey }}
        blankTemplateCard={blankTemplateCard}
        onTemplateSelect={onTemplateSelect}
      />
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
