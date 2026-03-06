import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { TemplateCard } from '../cards/templateCard';
import { useEffect, useMemo, useRef } from 'react';
import { setLayerHostSelector } from '@fluentui/react';
import type { CreateWorkflowHandler, TemplatesDesignerProps } from '../TemplatesDesigner';
import { QuickViewPanel } from '../../panel/templatePanel/quickViewPanel/quickViewPanel';
import { CreateWorkflowPanel } from '../../panel/templatePanel/createWorkflowPanel/createWorkflowPanel';
import { openPanelView, TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { TemplatesGalleryWithSearch } from './templatesgallerywithsearch';

const tabFilterKey = 'publishedBy';

export const TemplatesFullGalleryView = ({ detailFilters, createWorkflowCall, isWorkflowEmpty = true }: TemplatesDesignerProps) => {
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

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);

  return (
    <div ref={containerRef} style={{ position: 'absolute', width: '100%', height: '100%' }}>
      <TemplatesGalleryWithSearch
        searchAndFilterProps={{ detailFilters, tabFilterKey }}
        blankTemplateCard={blankTemplateCard}
        onTemplateSelect={onTemplateSelect}
      />
      <WorkflowView createWorkflowCall={createWorkflowCall} panelRef={containerRef} />
      <div
        id={'msla-layer-host'}
        style={{
          position: 'absolute',
          inset: '0px',
          visibility: 'hidden',
        }}
      />
    </div>
  );
};

const WorkflowView = ({
  createWorkflowCall,
  panelRef,
}: { createWorkflowCall: CreateWorkflowHandler; panelRef: React.RefObject<HTMLDivElement> }) => {
  const { templateName, workflows } = useSelector((state: RootState) => state.template);

  return templateName === undefined || Object.keys(workflows).length !== 1 ? null : (
    <>
      <QuickViewPanel mountNode={panelRef?.current} showCreate={true} workflowId={Object.keys(workflows)[0]} />
      <CreateWorkflowPanel mountNode={panelRef?.current} createWorkflow={createWorkflowCall} />
    </>
  );
};
