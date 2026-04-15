import { TemplatesPanelFooter } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/knowledge/store';
import { closePanel, KnowledgePanelView } from '../../../../core/state/knowledge/panelSlice';
import { setNotification } from '../../../../core/state/knowledge/optionsSlice';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  Text,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import { useAddFilePanelStyles, usePanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useMemo } from 'react';
import type { UploadFileHandler } from '@microsoft/logic-apps-shared';
import { FileUpload } from './uploadfile';
import { useFileHooks } from './useFileHooks';
import type { ServerNotificationData } from '../../../mcp/servers/servers';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const AddFilePanel = ({
  resourceId,
  mountNode,
  selectedHub,
  onUploadArtifact,
}: { resourceId: string; mountNode: HTMLDivElement | null; selectedHub?: string; onUploadArtifact: UploadFileHandler }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = { ...usePanelStyles(), ...useAddFilePanelStyles() };

  const { isOpen, currentPanelView } = useSelector((state: RootState) => state.knowledgeHubPanel);
  const INTL_TEXT = useMemo(
    () => ({
      title: intl.formatMessage({
        id: 'SUo94t',
        defaultMessage: 'Add files',
        description: 'Title for add files panel',
      }),
      loading: intl.formatMessage({
        id: 'h0ATm8',
        defaultMessage: 'Loading groups...',
        description: 'Placeholder text while loading groups in add files panel',
      }),
      closeAriaLabel: intl.formatMessage({
        id: 'kdCuJZ',
        defaultMessage: 'Close panel',
        description: 'Aria label for close button',
      }),
      parameterEmptyErrorMessage: intl.formatMessage({
        id: 'nX3iRl',
        defaultMessage: 'User input must not be empty.',
        description: 'Error message for parameter is empty',
      }),
      errorTitle: intl.formatMessage({
        id: 'K550WF',
        defaultMessage: 'File upload failed',
        description: 'Title for error message when file upload fails in add files panel',
      }),
    }),
    [intl]
  );

  const handleCancel = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const setNotificationData = useCallback(
    (data: ServerNotificationData) => {
      dispatch(setNotification(data));
    },
    [dispatch]
  );

  const { footerContent, handleSetFileDetails, groupName, uploadError } = useFileHooks(
    resourceId,
    selectedHub,
    () => dispatch(closePanel()),
    onUploadArtifact,
    setNotificationData
  );
  return (
    <Drawer
      className={styles.drawer}
      open={isOpen && currentPanelView === KnowledgePanelView.AddFiles}
      onOpenChange={(_, { open }) => !open && handleCancel()}
      position="end"
      size="large"
      mountNode={{ element: mountNode }}
    >
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleCancel}>
            {INTL_TEXT.closeAriaLabel}
          </Button>
        </div>
      </DrawerHeader>
      <DrawerBody className={styles.body}>
        {uploadError ? (
          <div>
            <MessageBar intent="error">
              <MessageBarBody>
                <MessageBarTitle>{INTL_TEXT.errorTitle}</MessageBarTitle>
                {uploadError}
              </MessageBarBody>
            </MessageBar>
          </div>
        ) : null}
        <FileUpload resourceId={resourceId} selectedHub={groupName} setDetails={handleSetFileDetails} />
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </Drawer>
  );
};
