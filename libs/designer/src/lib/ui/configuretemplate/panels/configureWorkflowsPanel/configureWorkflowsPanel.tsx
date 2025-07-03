import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, selectPanelTab, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { type TemplateTabProps, TemplateContent, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Drawer, DrawerBody, DrawerHeader, DrawerFooter, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useConfigureWorkflowPanelTabs } from './usePanelTabs';
import type { WorkflowTemplateData } from '../../../../core';
import type { Template } from '@microsoft/logic-apps-shared';
import { loadResourceDetailsFromWorkflowSource } from '../../../../core/actions/bjsworkflow/configuretemplate';

export interface ConfigureWorkflowsTabProps {
  onTabClick?: () => void;
  hasError?: boolean;
  disabled?: boolean;
  isPrimaryButtonDisabled: boolean;
  isSaving: boolean;
  onSave?: () => void;
  onClose?: () => void;
  status?: Template.TemplateEnvironment;
  selectedWorkflowsList: Record<string, Partial<WorkflowTemplateData>>;
}

const useStyles = makeStyles({
  drawer: {
    zIndex: 1000,
    height: '100%',
    width: '50%',
  },
  header: {
    ...shorthands.padding('0', tokens.spacingHorizontalL),
  },
  body: {
    ...shorthands.padding('0', tokens.spacingHorizontalL),
    overflow: 'auto',
  },
  footer: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
  },
});

export const ConfigureWorkflowsPanel = ({ onSave }: { onSave?: (isMultiWorkflow: boolean) => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { workflows, selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => ({
    selectedTabId: state.panel.selectedTabId,
    isOpen: state.panel.isOpen,
    currentPanelView: state.panel.currentPanelView,
    workflows: state.template.workflows,
  }));

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  const onRenderHeaderContent = useCallback(
    () => (
      <TemplatesPanelHeader
        title={intl.formatMessage({
          defaultMessage: 'Manage workflows in this template',
          id: 'syFW9c',
          description: 'Panel header title for managing workflows',
        })}
      >
        <div />
      </TemplatesPanelHeader>
    ),
    [intl]
  );

  const dismissPanel = useCallback(() => {
    const workflowSourceId = Object.values(workflows ?? {})?.[0]?.manifest?.metadata?.workflowSourceId;
    if (workflowSourceId) {
      dispatch(loadResourceDetailsFromWorkflowSource({ workflowSourceId }));
    }

    dispatch(closePanel());
  }, [dispatch, workflows]);

  const panelTabs: TemplateTabProps[] = useConfigureWorkflowPanelTabs({ onSave, onClose: dismissPanel });
  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];
  const styles = useStyles();

  return (
    <Drawer
      className={styles.drawer}
      modalType="non-modal"
      open={isOpen && currentPanelView === TemplatePanelView.ConfigureWorkflows}
      onOpenChange={(_, { open }) => !open && dismissPanel()}
      position="end"
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
