import { Panel, PanelType } from '@fluentui/react';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel } from '../../../core/state/templates/panelSlice';
import { CreateWorkflowPanel } from './createWorkflowPanel/createWorkflowPanel';
import { QuickViewPanel } from './quickViewPanel/quickViewPanel';
import { type TemplatePanelTab, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCreateWorkflowPanelTabs } from './createWorkflowPanel/usePanelTabs';
import { useQuickViewPanelTabs } from './quickViewPanel/usePanelTabs';
import { clearTemplateDetails } from '../../../core/state/templates/templateSlice';
import { useIntl } from 'react-intl';

export const TemplatePanel = ({ onCreateClick }: { onCreateClick: () => Promise<void> }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);
  const templateTitle = useSelector((state: RootState) => state.template?.manifest?.title) ?? '';
  const templateDescription = useSelector((state: RootState) => state.template?.manifest?.description) ?? '';
  const dismissPanel = useCallback(() => {
    dispatch(closePanel());
    dispatch(clearTemplateDetails());
  }, [dispatch]);
  const createWorkflowPanelTabs = useCreateWorkflowPanelTabs(onCreateClick);
  const quickViewPanelTabs = useQuickViewPanelTabs();

  const currentPanelTabs: TemplatePanelTab[] = useMemo(
    () => (currentPanelView === 'createWorkflow' ? createWorkflowPanelTabs : currentPanelView === 'quickView' ? quickViewPanelTabs : []),
    [currentPanelView, createWorkflowPanelTabs, quickViewPanelTabs]
  );

  const selectedTabProps = selectedTabId ? currentPanelTabs?.find((tab) => tab.id === selectedTabId) : currentPanelTabs[0];

  const intlText = useMemo(() => {
    return {
      CREATE_WORKFLOW: intl.formatMessage({
        defaultMessage: 'Create a new workflow',
        id: 'Y9VTmA',
        description: 'Panel header title for creating the workflow',
      }),
      BY_MICROSOFT: intl.formatMessage({
        defaultMessage: 'By Microsoft',
        id: 'Xs7Uvt',
        description: 'Panel description for stating it was created by Microsoft',
      }),
    };
  }, [intl]);

  const onRenderHeaderContent = useCallback(
    () => (
      <TemplatesPanelHeader
        title={currentPanelView === 'createWorkflow' ? intlText.CREATE_WORKFLOW : templateTitle}
        description={currentPanelView === 'createWorkflow' ? templateDescription : intlText.BY_MICROSOFT}
      />
    ),
    [templateTitle, templateDescription, currentPanelView, intlText]
  );
  const onRenderFooterContent = useCallback(
    () =>
      selectedTabProps?.footerContent ? (
        <TemplatesPanelFooter
          {...selectedTabProps?.footerContent}
          secondaryButtonOnClick={selectedTabProps?.footerContent?.secondaryButtonOnClick ?? dismissPanel}
        />
      ) : null,
    [selectedTabProps, dismissPanel]
  );

  return (
    <Panel
      isLightDismiss
      type={PanelType.medium}
      isOpen={isOpen}
      onDismiss={dismissPanel}
      hasCloseButton={true}
      onRenderHeader={onRenderHeaderContent}
      onRenderFooterContent={onRenderFooterContent}
      isFooterAtBottom={true}
    >
      {currentPanelView === 'createWorkflow' ? (
        <CreateWorkflowPanel panelTabs={createWorkflowPanelTabs} />
      ) : currentPanelView === 'quickView' ? (
        <QuickViewPanel panelTabs={quickViewPanelTabs} />
      ) : null}
    </Panel>
  );
};
