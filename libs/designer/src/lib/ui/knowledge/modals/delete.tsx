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
import { useCallback, useMemo } from 'react';
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
  const hubsToDelete: string[] = selectedArtifacts.filter((item) => item.parentId === null).map((item) => item.name.toLowerCase());
  const artifactsToDelete: Record<string, string> = selectedArtifacts
    .filter((item) => item.parentId !== null)
    .reduce(
      (acc, item) => {
        if (!hubsToDelete.includes((item.parentId as string).toLowerCase())) {
          acc[item.name.toLowerCase()] = item.parentId as string;
        }
        return acc;
      },
      {} as Record<string, string>
    );

  const hubNames = useMemo(() => hubsToDelete.join(', '), [hubsToDelete]);
  const artifactNames = useMemo(
    () =>
      Object.keys(artifactsToDelete)
        .map((key) => `${key} (hub: ${artifactsToDelete[key]})`)
        .join(', '),
    [artifactsToDelete]
  );
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Delete hub artifacts.',
      id: 'uc2g6Y',
      description: 'Title for the delete hub artifacts modal',
    }),
    multiArtifactsContent: intl.formatMessage({
      defaultMessage: `Confirm that you want to delete these hub artifacts? You can't undo this action. Deleting the hub will delete all artifacts under it.`,
      id: '/8PUD5',
      description: 'Content for the delete hub artifacts modal',
    }),
    hubContent: intl.formatMessage({
      defaultMessage: `Confirm that you want to delete this hub? You can't undo this action. Deleting the hub will delete all artifacts under it.`,
      id: 'zxFbNI',
      description: 'Content for the delete hub',
    }),
    artifactContent: intl.formatMessage({
      defaultMessage: `Confirm that you want to delete this artifact? You can't undo this action.`,
      id: 'R0Skk9',
      description: 'Content for the delete artifact',
    }),
    hubName: intl.formatMessage(
      {
        defaultMessage: 'Hub(s): {hubNames}',
        id: 'KfHL/5',
        description: 'The name of the hub to be deleted, shown in the delete confirmation modal',
      },
      { hubNames }
    ),
    artifactName: intl.formatMessage(
      {
        defaultMessage: 'Artifact(s): {artifactNames}',
        id: 'eW6zWL',
        description: 'The name of the artifact to be deleted, shown in the delete confirmation modal',
      },
      { artifactNames }
    ),
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
      defaultMessage: 'Successfully deleted the hub artifact(s).',
      id: 'iTtjSl',
      description: 'Title for the toaster after successfully deleting hub artifacts',
    }),
    successNotificationContent: intl.formatMessage({
      defaultMessage: 'The following hub artifacts were deleted.',
      id: '6/oxZR',
      description: 'Content for the toaster after successfully deleting hub artifacts, with the names of the deleted artifacts',
    }),
  };

  const handleDelete = useCallback(async () => {
    try {
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
        message: `Error while deleting knowledge hub artifact for the app: ${resourceId}`,
      });
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
            >
              {INTL_TEXT.deleteButtonText}
            </Button>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" onClick={onDismiss}>
                {INTL_TEXT.closeButtonText}
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
