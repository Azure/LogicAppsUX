import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import { LogEntryLevel, LoggerService, type UploadFileHandler, type UploadFile } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { FileUpload } from '../panel/files/uploadfile';

export const AddFilesModal = ({
  resourceId,
  selectedHub,
  onUploadArtifact,
  onDismiss,
}: {
  resourceId: string;
  selectedHub?: string;
  onUploadArtifact: UploadFileHandler;
  onDismiss: () => void;
}) => {
  const intl = useIntl();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Upload Files',
      id: 'aGKyI3',
      description: 'Title for the upload files modal',
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
      onDismiss();
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'Designer.uploadFileToKnowledgeHub',
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
  }, [fileDescriptions, fileNames, groupName, intl, onDismiss, onUploadArtifact, resourceId, selectedFiles]);

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
    <Dialog open={true} onOpenChange={onDismiss}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{INTL_TEXT.title}</DialogTitle>
          <DialogContent>
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
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button
                appearance="primary"
                disabled={
                  !groupName || selectedFiles.length === 0 || sizeTooLargeError !== undefined || isUploading || !hasNonEmptyFileNames
                }
                onClick={handleAdd}
              >
                {isUploading ? INTL_TEXT.addingButton : INTL_TEXT.addButton}
              </Button>
            </DialogTrigger>
            <DialogTrigger disableButtonEnhancement>
              <Button onClick={onDismiss} disabled={isUploading}>
                {INTL_TEXT.cancelButton}
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

const UploadSizeLimit = 16 * 1024 * 1024; // 16MB
