import type { NotificationData } from '../../core/state/NotificationSlice';
import { useEffect } from 'react';

// TODO: Will need to implement <Toast /> once Fluent V9 ships it

export interface NotificationProps extends NotificationData {
  autoHideDuration: number; // ms
  onClose: () => void;
}

export const Notification = (props: NotificationProps) => {
  const { /*msg, intent,*/ autoHideDuration, onClose } = props;

  useEffect(() => {
    const timer = setTimeout(onClose, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, onClose]);

  return null;

  /*
    return (
        <div style={{ width: '50%' }}>
            <Alert
                intent={intent}
                icon={!intent && <Delete20Regular />}
                action={{ icon: <Dismiss20Regular /> }}
            >
                {msg}
            </Alert>
        </div>
    );
    */
};
