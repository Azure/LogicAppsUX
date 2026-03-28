import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useCreateConnectionPanelTabs } from '../panel/connection/usepaneltabs';
import { type KnowledgeTabProps, TemplateContent, TemplatesPanelFooter } from '@microsoft/designer-ui';
import Constants from '../../../common/constants';
import { useConnectionStyles } from './styles';
import type { AppDispatch, RootState } from '../../../core/store';
import { useDispatch, useSelector } from 'react-redux';
import { closeKnowledgeConnectionModal } from '../../../core/state/modal/modalSlice';

export const CreateConnectionModal = ({ mountNode }: { mountNode: HTMLElement | null }) => {
  const styles = useConnectionStyles();
  const intl = useIntl();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Create Connection',
      id: 'ub55NF',
      description: 'Title for the create connection modal',
    }),
  };

  const { isKnowledgeConnectionOpen } = useSelector((state: RootState) => ({
    isKnowledgeConnectionOpen: state.modal.isKnowledgeConnectionOpen,
  }));
  const dispatch = useDispatch<AppDispatch>();

  const onDismiss = useCallback(() => {
    if (isKnowledgeConnectionOpen) {
      dispatch(closeKnowledgeConnectionModal());
    }
  }, [dispatch, isKnowledgeConnectionOpen]);

  const [selectedTabId, setSelectedTabId] = useState(Constants.KNOWLEDGE_PANEL_TAB_NAMES.BASICS);
  const panelTabs: KnowledgeTabProps[] = useCreateConnectionPanelTabs({ selectTab: setSelectedTabId, close: onDismiss });

  const selectedTabProps = useMemo(
    () => (selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0]),
    [selectedTabId, panelTabs]
  );

  return (
    <Dialog open={true} onOpenChange={onDismiss}>
      <DialogSurface mountNode={{ element: mountNode }}>
        <DialogBody>
          <DialogTitle
            action={
              <DialogTrigger action="close">
                <Button appearance="subtle" aria-label="close" icon={<Dismiss24Regular />} />
              </DialogTrigger>
            }
          >
            {INTL_TEXT.title}
          </DialogTitle>
          <DialogContent>
            <div className={styles.content}>
              <TemplateContent
                tabs={panelTabs}
                selectedTab={selectedTabId}
                selectTab={setSelectedTabId}
                containerClassName={'msla-templates-panel-mcp'}
              />
            </div>
          </DialogContent>
          <DialogActions position="start">
            <TemplatesPanelFooter {...selectedTabProps?.footerContent} />
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
