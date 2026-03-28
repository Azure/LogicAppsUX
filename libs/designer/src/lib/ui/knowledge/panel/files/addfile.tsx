import type { TemplatePanelFooterProps } from '@microsoft/designer-ui';
import { TemplatesPanelFooter } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/knowledge/store';
import { closePanel, KnowledgePanelView } from '../../../../core/state/knowledge/panelSlice';
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
import { useCallback, useMemo, useState } from 'react';
import { LoggerService, LogEntryLevel, type UploadFile, type UploadFileHandler } from '@microsoft/logic-apps-shared';
import { FileUpload } from './uploadfile';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);
const UploadSizeLimit = 16 * 1024 * 1024; // 16MB
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
  const INTL_TEXT = {
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
    largeFileError: intl.formatMessage({
      id: 'zuszqq',
      defaultMessage: 'File size must be less than 16 MB.',
      description: 'Error message when uploaded file exceeds size limit in add files panel',
    }),
    addButton: intl.formatMessage({
      id: '9EmZWH',
      defaultMessage: 'Add',
      description: 'Button text for adding files to knowledge base in add files panel',
    }),
    addingButton: intl.formatMessage({
      id: 'Lzm9eC',
      defaultMessage: 'Adding...',
      description: 'Button text for adding files to knowledge base in add files panel when upload is in progress',
    }),
    cancelButton: intl.formatMessage({
      id: 'K4G+Zo',
      defaultMessage: 'Cancel',
      description: 'Button text for canceling adding files to knowledge base in add files panel',
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
  };

  const [groupName, setGroupName] = useState<string>(selectedHub ?? '');
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const sizeTooLargeError = useMemo(
    () => (selectedFiles.some((x) => x.file.size > UploadSizeLimit) ? INTL_TEXT.largeFileError : undefined),
    [INTL_TEXT.largeFileError, selectedFiles]
  );

  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  const hasNonEmptyFileNames = useMemo(
    () =>
      selectedFiles.length > 0 &&
      selectedFiles.every((file) => {
        const name = fileNames[file.uuid];
        return name !== undefined && name.trim() !== '';
      }),
    [fileNames, selectedFiles]
  );

  const handleCancel = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);

  const handleAdd = useCallback(async () => {
    setUploadError(undefined);

    try {
      await onUploadArtifact(
        resourceId,
        groupName,
        { file: selectedFiles[0], name: fileNames[selectedFiles[0].uuid], description: fileDescriptions[selectedFiles[0].uuid] },
        setIsUploading
      );
      // For now we will just close the panel after upload. We can add a success message and keep the panel open in future if needed.
      dispatch(closePanel());
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'KnowledgeHub.uploadFileToKnowledgeHub',
        error,
        message: `Error occurred during file upload to the knowledge hub: ${resourceId}`,
      });

      setUploadError(
        intl.formatMessage(
          {
            id: '+nKZHB',
            defaultMessage: `Can't upload file. Please try again. Error: {errorMessage}`,
            description: 'Error message when file upload fails in add files panel',
          },
          { errorMessage }
        )
      );
      setIsUploading(false);
    }
  }, [dispatch, fileDescriptions, fileNames, groupName, intl, onUploadArtifact, resourceId, selectedFiles]);

  const handleClose = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: isUploading ? INTL_TEXT.addingButton : INTL_TEXT.addButton,
          appearance: 'primary',
          disabled: !groupName || selectedFiles.length === 0 || sizeTooLargeError !== undefined || isUploading || !hasNonEmptyFileNames,
          onClick: handleAdd,
        },
        {
          type: 'action',
          text: INTL_TEXT.cancelButton,
          onClick: handleCancel,
        },
      ],
    };
  }, [
    INTL_TEXT.addButton,
    INTL_TEXT.addingButton,
    INTL_TEXT.cancelButton,
    groupName,
    handleAdd,
    handleCancel,
    hasNonEmptyFileNames,
    isUploading,
    selectedFiles.length,
    sizeTooLargeError,
  ]);

  const handleSetFileDetails = useCallback(
    ({
      groupName,
      selectedFiles,
      fileNames,
      fileDescriptions,
    }: {
      groupName?: string;
      selectedFiles?: UploadFile[];
      fileNames?: Record<string, string>;
      fileDescriptions?: Record<string, string>;
    }) => {
      if (groupName !== undefined) {
        setGroupName(groupName);
      }
      if (selectedFiles !== undefined) {
        setSelectedFiles(selectedFiles);
      }
      if (fileNames !== undefined) {
        setFileNames(fileNames);
      }
      if (fileDescriptions !== undefined) {
        setFileDescriptions(fileDescriptions);
      }
    },
    []
  );

  return (
    <Drawer
      className={styles.drawer}
      open={isOpen && currentPanelView === KnowledgePanelView.AddFiles}
      onOpenChange={(_, { open }) => !open && handleClose()}
      position="end"
      size="large"
      mountNode={{ element: mountNode }}
    >
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleClose}>
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
