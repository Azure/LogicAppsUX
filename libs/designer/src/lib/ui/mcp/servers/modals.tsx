import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { AddServerButtons } from './add';
import { Dismiss24Regular } from '@fluentui/react-icons';

export const DeleteModal = ({ onDelete, onDismiss }: { onDelete: () => void; onDismiss: () => void }) => {
  const intl = useIntl();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Delete this MCP server group',
      id: 'J8T6HJ',
      description: 'Title for the delete MCP server group modal',
    }),
    content: intl.formatMessage({
      defaultMessage: 'Are you sure you want to delete this MCP server group? This action cannot be undone.',
      id: 'YEY2TH',
      description: 'Content for the delete MCP server group modal',
    }),
    deleteButtonText: intl.formatMessage({
      defaultMessage: 'Delete',
      id: 'jjIhsG',
      description: 'Button text for deleting the MCP server group',
    }),
    closeButtonText: intl.formatMessage({
      defaultMessage: 'Continue editing',
      id: 'PY8zog',
      description: 'Button text for closing the delete MCP server group modal',
    }),
  };

  return (
    <Dialog open={true} onOpenChange={onDismiss}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{INTL_TEXT.title}</DialogTitle>
          <DialogContent>{INTL_TEXT.content}</DialogContent>
          <DialogActions>
            <Button
              appearance="primary"
              style={{
                background: tokens.colorStatusDangerForeground1,
              }}
              onClick={onDelete}
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

export const EmptyWorkflowsModal = ({ onDismiss }: { onDismiss: () => void }) => {
  const intl = useIntl();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'No workflows are available',
      id: '8LqCdK',
      description: 'Title for the empty workflows modal',
    }),
    content: intl.formatMessage({
      defaultMessage:
        "You need atleast one workflow in this logic app to create an MCP server from existing workflows. Select the 'Create new workflows' to build tools from connector actions on your server.",
      id: 'sKS42Y',
      description: 'Content for the empty workflows modal',
    }),
    closeButtonText: intl.formatMessage({
      defaultMessage: 'Close',
      id: '7Wn0bz',
      description: 'Button text for closing the empty workflows modal',
    }),
  };

  return (
    <Dialog open={true} onOpenChange={onDismiss}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{INTL_TEXT.title}</DialogTitle>
          <DialogContent>{INTL_TEXT.content}</DialogContent>
          <DialogActions>
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

export const AddServerModal = ({ onCreateTools, onDismiss }: { onCreateTools: () => void; onDismiss: () => void }) => {
  const intl = useIntl();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Create options for MCP servers',
      id: 'sIZp9W',
      description: 'Title for the add server modal',
    }),
    subtitle: intl.formatMessage({
      defaultMessage: 'Use existing workflows in your logic app or create new tools.',
      id: '8x1csA',
      description: 'Subtitle for the add server modal',
    }),
  };

  return (
    <Dialog open={true} onOpenChange={onDismiss}>
      <DialogSurface>
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
            <Text>{INTL_TEXT.subtitle}</Text>
            <br />
            <AddServerButtons onCreateTools={onCreateTools} />
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
