import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import type { UploadFileHandler } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { FileUpload } from '../panel/files/uploadfile';
import { useFileHooks } from '../panel/files/useFileHooks';
import { TemplatesPanelFooter } from '@microsoft/designer-ui';

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
  const INTL_TEXT = useMemo(
    () => ({
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
    }),
    [intl]
  );

  const { footerContent, handleSetFileDetails, groupName, uploadError } = useFileHooks(
    resourceId,
    selectedHub,
    onDismiss,
    onUploadArtifact
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
            <TemplatesPanelFooter {...footerContent} />
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
