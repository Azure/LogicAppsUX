import type { RootState } from '../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { CreateWorkflowPanel } from './createWorkflowPanel/createWorkflowPanel';
import { QuickViewPanel } from './quickViewPanel/quickViewPanel';
import type { CreateWorkflowHandler } from '../../templates';

export interface TemplatePanelProps {
  showCreate: boolean;
  workflowId: string;
  createWorkflow?: CreateWorkflowHandler;
  clearDetailsOnClose?: boolean;
  onClose?: () => void;
}

export const TemplatePanel = (props: TemplatePanelProps) => {
  const { isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);

  if (!isOpen) {
    return null;
  }

  return currentPanelView === TemplatePanelView.QuickView ? <QuickViewPanel {...props} /> : <CreateWorkflowPanel {...props} />;
  // const dispatch = useDispatch<AppDispatch>();
  // const intl = useIntl();
  // const { selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);
  // const { templateName, workflowAppName, manifest, workflows } = useSelector((state: RootState) => ({
  //   templateName: state.template.templateName,
  //   workflowAppName: state.workflow.workflowAppName,
  //   manifest: state.template.manifest,
  //   workflows: state.template.workflows,
  // }));
  // const isMultiWorkflowTemplate = useMemo(() => Object.keys(workflows).length > 1, [workflows]);
  // const isCreatePanelView = useMemo(() => currentPanelView === 'createWorkflow', [currentPanelView]);
  // const templateTitle = manifest?.title ?? '';
  // const templateDescription = manifest?.description ?? '';
  // const templateSourceCodeUrl = manifest?.sourceCodeUrl;

  // const resources = {
  //   multiWorkflowCreateTitle: intl.formatMessage({
  //     defaultMessage: 'Create workflows from template',
  //     id: '5pSOjg',
  //     description: 'Panel header title for creating workflows',
  //   }),
  // };

  // const dismissPanel = useCallback(() => {
  //   dispatch(closePanel());

  //   if (clearDetailsOnClose) {
  //     dispatch(clearTemplateDetails());
  //   }

  //   onClose?.();
  // }, [clearDetailsOnClose, dispatch, onClose]);

  // const currentPanelTabs: TemplatePanelTab[] = useMemo(
  //   () =>
  //     isCreatePanelView
  //       ? []
  //       : getQuickViewTabs(intl, dispatch, workflowId as string, showCreate, {
  //           templateId: templateName ?? 'Unknown',
  //           workflowAppName,
  //           isMultiWorkflow: isMultiWorkflowTemplate,
  //         }),
  //   [isCreatePanelView, intl, dispatch, workflowId, showCreate, templateName, workflowAppName, isMultiWorkflowTemplate]
  // );

  // const selectedTabProps = selectedTabId ? currentPanelTabs?.find((tab) => tab.id === selectedTabId) : currentPanelTabs[0];
  // const layerProps = {
  //   hostId: 'msla-layer-host',
  //   eventBubblingEnabled: true,
  // };

  // const onRenderHeaderContent = useCallback(
  //   () =>
  //     isCreatePanelView ? (
  //       <CreateWorkflowPanelHeader
  //         headerTitle={isMultiWorkflowTemplate ? resources.multiWorkflowCreateTitle : undefined}
  //         title={templateTitle}
  //         description={templateDescription}
  //       />
  //     ) : (
  //       <QuickViewPanelHeader
  //         title={templateTitle}
  //         description={templateDescription}
  //         sourceCodeUrl={templateSourceCodeUrl}
  //         details={manifest?.details ?? {}}
  //       />
  //     ),
  //   [
  //     isCreatePanelView,
  //     isMultiWorkflowTemplate,
  //     resources.multiWorkflowCreateTitle,
  //     templateTitle,
  //     templateDescription,
  //     templateSourceCodeUrl,
  //     manifest?.details,
  //   ]
  // );
  // const onRenderFooterContent = useCallback(
  //   () =>
  //     selectedTabProps?.footerContent ? <TemplatesPanelFooter showPrimaryButton={showCreate} {...selectedTabProps?.footerContent} /> : null,
  //   [selectedTabProps?.footerContent, showCreate]
  // );

  // return (
  //   <Panel
  //     styles={{ main: { padding: '0 20px', zIndex: 1000 }, content: { paddingLeft: '0px' } }}
  //     isLightDismiss
  //     type={isCreatePanelView ? PanelType.custom : PanelType.medium}
  //     customWidth={'50%'}
  //     isOpen={isOpen}
  //     onDismiss={dismissPanel}
  //     hasCloseButton={true}
  //     onRenderHeader={onRenderHeaderContent}
  //     onRenderFooterContent={onRenderFooterContent}
  //     layerProps={layerProps}
  //     isFooterAtBottom={true}
  //   >
  //     {/* <QuickViewPanel workflowId={workflowId as string} clearDetailsOnClose={clearDetailsOnClose} /> */}

  //   </Panel>
  // );
};
