import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface ConfirmProps {
  hidden: boolean;
  message: string;
  title: string;
  onConfirm(): void;
  onDismiss(): void;
}

export const Confirm: React.FC<ConfirmProps> = ({ hidden, message, title, onConfirm, onDismiss }) => {
  const intl = useIntl();

  const okMessage = intl.formatMessage({
    defaultMessage: 'OK',
    id: '7GSk99',
    description: 'OK message appearing on a confirmation dialog.',
  });
  const cancelMessage = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: 'iUs7pv',
    description: 'Cancel message appearing on a confirmation dialog.',
  });
  return (
    <Dialog
      modalType="alert"
      open={!hidden}
      onOpenChange={(_, data) => {
        if (!data.open) {
          onDismiss();
        }
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>{message}</DialogContent>
          <DialogActions>
            <Button onClick={onDismiss}>{cancelMessage}</Button>
            <Button appearance="primary" onClick={onConfirm}>
              {okMessage}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
