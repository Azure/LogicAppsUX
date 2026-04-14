import { useId, Toaster, useToastController, ToastTitle, Toast, ToastBody, type ToastIntent } from '@fluentui/react-components';
import { useEffect, useCallback } from 'react';

export type NotificationType = 'success' | 'failure';

export interface ToasterNotificationProps {
  /** Type of notification. Default: 'success' */
  type?: NotificationType;
  title: string;
  content: string;
  /** Duration in milliseconds before auto-dismiss. Default: 5000ms */
  duration?: number;
  /** Callback when the notification is cleared */
  onClear?: () => void;
}

const getToastIntent = (type: NotificationType): ToastIntent => {
  return type === 'success' ? 'success' : 'error';
};

export const ToasterNotification = ({ type = 'success', title, content, duration = 5000, onClear }: ToasterNotificationProps) => {
  const toasterId = useId('knowledge-toaster');
  const toastId = useId('knowledge-toast');
  const { dispatchToast } = useToastController(toasterId);

  const showToast = useCallback(() => {
    dispatchToast(
      <Toast>
        <ToastTitle>{title}</ToastTitle>
        <ToastBody style={{ paddingTop: 8 }}>{content}</ToastBody>
      </Toast>,
      {
        toastId,
        intent: getToastIntent(type),
        position: 'top-end',
        timeout: duration,
        onStatusChange: (_e, data) => {
          if (data.status === 'unmounted') {
            onClear?.();
          }
        },
      }
    );
  }, [dispatchToast, toastId, title, content, type, duration, onClear]);

  useEffect(() => {
    showToast();
  }, [showToast]);

  return <Toaster toasterId={toasterId} offset={{ horizontal: 20, vertical: 20 }} />;
};
