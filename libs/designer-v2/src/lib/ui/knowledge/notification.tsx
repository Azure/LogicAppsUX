import { Toast, ToastBody, Toaster, ToastTitle, type ToastIntent, useId, useToastController } from '@fluentui/react-components';
import { useCallback, useEffect } from 'react';

export type NotificationType = 'success' | 'failure';

export interface ToasterNotificationProps {
  type?: NotificationType;
  title: string;
  content: string;
  duration?: number;
  onClear?: () => void;
}

const getToastIntent = (type: NotificationType): ToastIntent => (type === 'success' ? 'success' : 'error');

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
        onStatusChange: (_event, data) => {
          if (data.status === 'unmounted') {
            onClear?.();
          }
        },
      }
    );
  }, [content, dispatchToast, duration, onClear, title, toastId, type]);

  useEffect(() => {
    showToast();
  }, [showToast]);

  return <Toaster toasterId={toasterId} offset={{ horizontal: 20, vertical: 20 }} />;
};
