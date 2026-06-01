import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface AlertProps {
  hidden: boolean;
  message: string;
  title: string;
  onDismiss(): void;
}

export const Alert: React.FC<AlertProps> = ({ hidden, message, title, onDismiss }) => {
  const intl = useIntl();

  const okMessage = intl.formatMessage({
    defaultMessage: 'OK',
    id: 'uN4zFU',
    description: 'OK message appearing on a alert message modal.',
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
            <Button appearance="primary" onClick={onDismiss}>
              {okMessage}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
