import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, selectPanelTab, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { type TemplateTabProps, TemplateContent, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { ChevronDown16Regular, ChevronUp16Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Text, Button, Label, Drawer, DrawerBody, DrawerHeader, DrawerFooter } from '@fluentui/react-components';
import Markdown from 'react-markdown';
import { useCreateWorkflowPanelTabs } from './usePanelTabs';
import { isMultiWorkflowTemplate } from '../../../../core/actions/bjsworkflow/templates';
import type { CreateWorkflowHandler } from '../../../templates';
import { useExistingWorkflowNames } from '../../../../core/queries/template';
import { clearTemplateDetails } from '../../../../core/state/templates/templateSlice';
import { useStyles } from './createWorkflowPanel.styles';

export interface CreateWorkflowTabProps {
  isCreating: boolean;
  previousTabId?: string;
  nextTabId?: string;
  hasError: boolean;
  disabled?: boolean;
  shouldClearDetails: boolean;
  showCloseButton?: boolean;
  onClosePanel?: () => void;
}

export interface CreateWorkflowPanelProps {
  createWorkflow?: CreateWorkflowHandler;
  clearDetailsOnClose?: boolean;
  panelWidth?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export const CreateWorkflowPanel = ({
  createWorkflow,
  onClose,
  panelWidth = '50%',
  clearDetailsOnClose = true,
  showCloseButton = true,
}: CreateWorkflowPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { refetch: refetchWorkflowNames } = useExistingWorkflowNames();
  const { selectedTabId, manifest, isOpen, isCreateView, currentPanelView, shouldCloseByDefault } = useSelector((state: RootState) => ({
    selectedTabId: state.panel.selectedTabId,
    manifest: state.template.manifest,
    isOpen: state.panel.isOpen,
    isCreateView: state.workflow.isCreateView,
    currentPanelView: state.panel.currentPanelView,
    shouldCloseByDefault: !state.templateOptions.viewTemplateDetails,
  }));
  const isMultiWorkflow = useMemo(() => !!manifest && isMultiWorkflowTemplate(manifest), [manifest]);

  const panelTabs: TemplateTabProps[] = useCreateWorkflowPanelTabs({
    isMultiWorkflowTemplate: isMultiWorkflow,
    createWorkflow: createWorkflow ?? (() => Promise.resolve()),
    showCloseButton,
    onClosePanel: onClose,
  });

  const resources = {
    multiWorkflowCreateTitle: intl.formatMessage({
      defaultMessage: 'Create workflows from template',
      id: '5pSOjg',
      description: 'Panel header title for creating workflows',
    }),
    updatedWorkflowTitle: intl.formatMessage({
      defaultMessage: 'Update workflow from template',
      id: '5zW+oj',
      description: 'Panel header title for updating the workflow',
    }),
  };

  useEffect(() => {
    if (isOpen) {
      refetchWorkflowNames();
    }
  }, [isOpen, refetchWorkflowNames]);

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  const dismissPanel = useCallback(() => {
    dispatch(closePanel());

    if (clearDetailsOnClose) {
      dispatch(clearTemplateDetails());
    }

    onClose?.();
  }, [clearDetailsOnClose, dispatch, onClose]);

  const onRenderHeaderContent = useCallback(
    () => (
      <CreateWorkflowPanelHeader
        headerTitle={isMultiWorkflow ? resources.multiWorkflowCreateTitle : isCreateView ? undefined : resources.updatedWorkflowTitle}
        title={manifest?.title ?? ''}
        summary={manifest?.summary ?? ''}
        onClose={shouldCloseByDefault ? dismissPanel : undefined}
      />
    ),
    [
      isMultiWorkflow,
      resources.multiWorkflowCreateTitle,
      resources.updatedWorkflowTitle,
      isCreateView,
      manifest?.title,
      manifest?.summary,
      shouldCloseByDefault,
      dismissPanel,
    ]
  );

  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];

  const styles = useStyles();

  return (
    <Drawer
      className={styles.drawer}
      modalType={shouldCloseByDefault ? 'modal' : 'non-modal'}
      open={isOpen && currentPanelView === TemplatePanelView.CreateWorkflow}
      onOpenChange={(_, { open }) => !open && shouldCloseByDefault && dismissPanel()}
      position="end"
      style={{ width: panelWidth }}
    >
      <DrawerHeader className={styles.header}>{onRenderHeaderContent()}</DrawerHeader>
      <DrawerBody className={styles.body}>
        <TemplateContent tabs={panelTabs} selectedTab={selectedTabId ?? panelTabs?.[0]?.id} selectTab={handleSelectTab} />
      </DrawerBody>
      {selectedTabProps?.footerContent && (
        <DrawerFooter className={styles.footer}>
          <TemplatesPanelFooter {...selectedTabProps.footerContent} />
        </DrawerFooter>
      )}
    </Drawer>
  );
};

export const CreateWorkflowPanelHeader = ({
  headerTitle,
  title,
  summary,
  onClose,
}: { title: string; summary: string; headerTitle?: string; onClose?: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const intl = useIntl();
  const styles = useStyles();

  const intlText = {
    CREATE_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Create a new workflow from template',
      id: 'RZNabt',
      description: 'Panel header title for creating the workflow',
    }),
    TEMPLATE_DETAILS: intl.formatMessage({
      defaultMessage: 'Template details',
      id: 'Btpmnv',
      description: 'Panel description title for template details where you can select for more information',
    }),
    NAME: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'DX9jWz',
      description: 'Description label for template name',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Description',
      id: 'l9+EbH',
      description: 'Description label for template description',
    }),
  };

  const closeButton = onClose ? (
    <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} className={styles.closeButton}>
      {intl.formatMessage({
        defaultMessage: 'Close Panel',
        id: 'XV/4oe',
        description: 'Close panel button text',
      })}
    </Button>
  ) : undefined;

  return (
    <TemplatesPanelHeader title={headerTitle ?? intlText.CREATE_WORKFLOW} rightAction={closeButton}>
      <div
        className={styles.templateDetailsToggle}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <Text className={styles.templateDetailsToggleText}>{intlText.TEMPLATE_DETAILS}</Text>
        {isOpen ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
      </div>
      {isOpen && (
        <div className={styles.descriptionWrapper}>
          <div className={styles.descriptionRow}>
            <Label className={styles.descriptionTitle}>{intlText.NAME}</Label>
            <Text className={styles.descriptionText}>{title}</Text>
          </div>
          <div className={styles.descriptionRow}>
            <Label className={styles.descriptionTitle}>{intlText.DESCRIPTION}</Label>
            <Markdown className={styles.descriptionText} linkTarget="_blank">
              {summary}
            </Markdown>
          </div>
        </div>
      )}
    </TemplatesPanelHeader>
  );
};
