import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  tokens,
  Text,
} from '@fluentui/react-components';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import type { KnowledgeHubItem } from '../wizard/knowledgelist';
import type { ServerNotificationData as NotificationData } from '../../mcp/servers/servers';
import { useModalStyles } from './styles';
import { deleteKnowledgeHubArtifacts } from '../../../core/knowledge/utils/helper';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

export const DeleteModal = ({
  selectedArtifacts,
  resourceId,
  onDelete,
  onDismiss,
}: { selectedArtifacts: KnowledgeHubItem[]; resourceId: string; onDelete: (data: NotificationData) => void; onDismiss: () => void }) => {
  const intl = useIntl();
  const hubsToDelete: string[] = useMemo(
    () => selectedArtifacts.filter((item) => item.parentId === null).map((item) => item.name.toLowerCase()),
    [selectedArtifacts]
  );
  const artifactsToDelete: Record<string, string> = useMemo(
    () =>
      selectedArtifacts
        .filter((item) => item.parentId !== null)
        .reduce(
          (acc, item) => {
            if (!hubsToDelete.includes((item.parentId as string).toLowerCase())) {
              acc[item.name.toLowerCase()] = item.parentId as string;
            }
            return acc;
          },
          {} as Record<string, string>
        ),
    [selectedArtifacts, hubsToDelete]
  );

  const hubNames = useMemo(() => hubsToDelete.join(', '), [hubsToDelete]);
  const artifactNames = useMemo(
    () =>
      Object.keys(artifactsToDelete)
        .map((key) => `${key} (hub: ${artifactsToDelete[key]})`)
        .join(', '),
    [artifactsToDelete]
  );
  const INTL_TEXT = useMemo(
    () => ({
      title: intl.formatMessage({
        defaultMessage: 'Delete hub artifacts',
        id: 'HMyJSH',
        description: 'Title for the delete hub artifacts modal',
      }),
      multiArtifactsContent: intl.formatMessage({
        defaultMessage: `Confirm that you want to delete these hub artifacts? Deleting a hub deletes all its artifacts. You can't undo this action.`,
        id: 'uYxnwQ',
        description: 'Content for the delete hub artifacts modal',
      }),
      hubContent: intl.formatMessage({
        defaultMessage: `Confirm that you want to delete this hub? This action also deletes all the hub's artifacts. You can't undo this action.`,
        id: 'Xjhrkz',
        description: 'Content for the delete hub',
      }),
      artifactContent: intl.formatMessage({
        defaultMessage: `Confirm that you want to delete this artifact? You can't undo this action.`,
        id: 'R0Skk9',
        description: 'Content for the delete artifact',
      }),
      hubName: intl.formatMessage(
        {
          defaultMessage: 'Hubs: {hubNames}',
          id: 'DAqQK1',
          description: 'The name of the hub to be deleted, shown in the delete confirmation modal',
        },
        { hubNames }
      ),
      artifactName: intl.formatMessage(
        {
          defaultMessage: 'Artifacts: {artifactNames}',
          id: 'fm59Od',
          description: 'The name of the artifact to be deleted, shown in the delete confirmation modal',
        },
        { artifactNames }
      ),
      deletingButtonText: intl.formatMessage({
        defaultMessage: 'Deleting...',
        id: 'HTwVAR',
        description: 'Button text for when the hub artifacts are being deleted',
      }),
      deleteButtonText: intl.formatMessage({
        defaultMessage: 'Delete',
        id: 'w1QL1r',
        description: 'Button text for deleting the hub artifacts',
      }),
      closeButtonText: intl.formatMessage({
        defaultMessage: 'Continue editing',
        id: 'GYui13',
        description: 'Button text for closing the delete hub artifacts modal',
      }),
      successNotificationTitle: intl.formatMessage({
        defaultMessage: 'Successfully deleted the hub artifacts.',
        id: '8iLlRQ',
        description: 'Title for the toaster after successfully deleting hub artifacts',
      }),
      successNotificationContent: intl.formatMessage({
        defaultMessage: 'Deleted the following hub artifacts:',
        id: 'H9pzpO',
        description: 'Content for the toaster after successfully deleting hub artifacts, with the names of the deleted artifacts',
      }),
    }),
    [intl, hubNames, artifactNames]
  );

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      await deleteKnowledgeHubArtifacts(resourceId, hubsToDelete, artifactsToDelete);
      onDelete({
        title: INTL_TEXT.successNotificationTitle,
        content: `${INTL_TEXT.successNotificationContent}\n${hubNames}${artifactNames ? `\n${artifactNames}` : ''}`,
      });
      onDismiss();
    } catch (errorResponse: any) {
      const error = errorResponse?.error || {};
      // For now log the error
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'KnowledgeHub.deleteKnowledgeHubArtifact',
        error,
        message: `The following error happened when deleting the knowledge hub artifact for the app: ${resourceId}`,
      });
    } finally {
      setIsDeleting(false);
    }
  }, [
    INTL_TEXT.successNotificationContent,
    INTL_TEXT.successNotificationTitle,
    artifactNames,
    artifactsToDelete,
    hubNames,
    hubsToDelete,
    onDelete,
    onDismiss,
    resourceId,
  ]);

  const styles = useModalStyles();
  return (
    <Dialog open={true} onOpenChange={onDismiss}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{INTL_TEXT.title}</DialogTitle>
          <DialogContent>
            {selectedArtifacts.length > 1 ? (
              <div className={styles.content}>
                <Text>{INTL_TEXT.multiArtifactsContent}</Text>
                <br />
                {hubsToDelete.length > 0 && (
                  <>
                    <Text>{INTL_TEXT.hubName}</Text>
                    <br />
                  </>
                )}
                {Object.keys(artifactsToDelete).length > 0 && <Text>{INTL_TEXT.artifactName}</Text>}
              </div>
            ) : selectedArtifacts[0].parentId === null ? (
              INTL_TEXT.hubContent
            ) : (
              INTL_TEXT.artifactContent
            )}
          </DialogContent>
          <DialogActions>
            <Button
              appearance="primary"
              style={{
                background: tokens.colorStatusDangerForeground1,
              }}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? INTL_TEXT.deletingButtonText : INTL_TEXT.deleteButtonText}
            </Button>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" onClick={onDismiss} disabled={isDeleting}>
                {INTL_TEXT.closeButtonText}
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
