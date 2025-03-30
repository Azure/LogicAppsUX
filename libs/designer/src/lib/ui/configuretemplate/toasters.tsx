import {
  useId,
  Text,
  Toaster,
  useToastController,
  ToastTitle,
  Toast,
  ToastBody,
  type ToastPosition,
  type ToastPoliteness,
} from '@fluentui/react-components';
import { useEffect, useMemo } from 'react';
import { useResourceStrings } from './resources';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/templates/store';

export const TemplateInfoToast = ({ title, content, show }: { title: string; content: string; show: boolean }) => {
  const toastId = useId('template-info-toast');
  const toasterId = useId('template-info-toaster');

  const { workflows, environment, isPublished } = useSelector((state: RootState) => state.template);
  const type = useMemo(() => {
    const workflowKeys = Object.keys(workflows);
    return workflowKeys.length === 1 ? 'Workflow' : workflowKeys.length > 1 ? 'Accelerator' : '----';
  }, [workflows]);
  const statusText = useMemo(() => `${isPublished ? 'Published' : 'Unpublished'}, ${environment}`, [environment, isPublished]);

  const { dispatchToast, updateToast } = useToastController(toasterId);
  const toastDetails = useMemo(
    () => ({
      toastId,
      politeness: 'polite' as ToastPoliteness,
      position: 'top-end' as ToastPosition,
      timeout: -1,
    }),
    [toastId]
  );

  useEffect(
    () => dispatchToast(<InfoToastContent type={type} status={statusText} lastSaved="----" />, toastDetails),
    [dispatchToast, statusText, toastDetails, toastId, type]
  );

  useEffect(() => {
    if (!show) {
      updateToast({
        content: <InfoToastContent type={type} status={statusText} lastSaved="----" />,
        ...toastDetails,
      });
    }
  }, [show, statusText, toastDetails, toastId, type, updateToast]);

  useEffect(() => {
    if (show) {
      updateToast({
        content: (
          <Toast>
            <ToastTitle>{title}</ToastTitle>
            <ToastBody style={{ paddingTop: 12, marginLeft: '-18px', fontSize: 'small' }}>{content}</ToastBody>
          </Toast>
        ),
        ...toastDetails,
        intent: 'success',
      });
    }
  }, [content, show, title, toastDetails, updateToast]);

  return <Toaster toasterId={toasterId} />;
};

const InfoToastContent = ({ type, status, lastSaved }: { type: string; status: string; lastSaved: string }) => {
  const resources = useResourceStrings();
  return (
    <Toast>
      <ToastTitle media={null}>{resources.TemplateInformation}</ToastTitle>
      <ToastBody style={{ display: 'flex', flexDirection: 'column', paddingTop: '10px' }}>
        <Text>
          {resources.Type}: {type}
        </Text>
        <Text style={{ padding: '5px 0' }}>
          {resources.Status}: {status}
        </Text>
        <Text>
          {resources.LastSaved}: {lastSaved}
        </Text>
      </ToastBody>
    </Toast>
  );
};
