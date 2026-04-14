import { LogEntryLevel, LoggerService, type UploadFile } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import type { TemplatePanelFooterProps } from '@microsoft/designer-ui';
import type { ServerNotificationData } from '../../../mcp/servers/servers';

const UploadSizeLimit = 16 * 1024 * 1024; // 16MB
export const useFileHooks = (
  resourceId: string,
  hubName: string | undefined,
  closePanel: () => void,
  onUploadArtifact: (
    resourceId: string,
    groupName: string,
    file: { file: UploadFile; name: string; description?: string },
    setIsUploading: (isUploading: boolean) => void
  ) => Promise<void>,
  setNotification?: (data: ServerNotificationData) => void
) => {
  const intl = useIntl();
  const INTL_TEXT = useMemo(
    () => ({
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
    }),
    [intl]
  );

  const [groupName, setGroupName] = useState<string>(hubName ?? '');
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
      setNotification?.({
        title: intl.formatMessage({
          id: 'rUgi69',
          defaultMessage: 'File uploaded',
          description: 'Notification title for successful file upload in add files panel',
        }),
        content: intl.formatMessage(
          {
            id: 'ENMteK',
            defaultMessage: 'File has been successfully uploaded in knowledge hub {groupName}.',
            description: 'Notification content for successful file upload in add files panel',
          },
          { groupName }
        ),
      });
      closePanel();
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
  }, [closePanel, fileDescriptions, fileNames, groupName, intl, onUploadArtifact, resourceId, selectedFiles, setNotification]);

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
          onClick: closePanel,
        },
      ],
    };
  }, [
    INTL_TEXT.addButton,
    INTL_TEXT.addingButton,
    INTL_TEXT.cancelButton,
    closePanel,
    groupName,
    handleAdd,
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

  return {
    footerContent,
    handleSetFileDetails,
    groupName,
    uploadError,
  };
};
