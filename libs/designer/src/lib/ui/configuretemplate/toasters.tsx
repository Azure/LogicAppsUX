import { useId, Text, Toaster, useToastController, ToastTitle, Toast, ToastBody } from '@fluentui/react-components';
import { useEffect, useMemo } from 'react';
import { useResourceStrings } from './resources';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/templates/store';

export const TemplateInfoToast = () => {
  const toastId = useId('template-info-toast');
  const toasterId = useId('template-info-toaster');
  const resources = useResourceStrings();
  const { workflows, environment, isPublished } = useSelector((state: RootState) => state.template);
  const type = useMemo(() => {
    const workflowKeys = Object.keys(workflows);
    return workflowKeys.length === 1 ? 'Workflow' : workflowKeys.length > 1 ? 'Accelerator' : '----';
  }, [workflows]);
  const statusText = useMemo(() => `${isPublished ? 'Published' : 'Unpublished'}, ${environment}`, [environment, isPublished]);

  const { dispatchToast } = useToastController(toasterId);
  useEffect(() => {
    dispatchToast(
      <Toast>
        <ToastTitle media={null}>{resources.TemplateInformation}</ToastTitle>
        <ToastBody style={{ display: 'flex', flexDirection: 'column', paddingTop: '10px' }}>
          <Text>
            {resources.Type}: {type}
          </Text>
          <Text style={{ padding: '5px 0' }}>
            {resources.Status}: {statusText}
          </Text>
          <Text>{resources.LastSaved}: ----</Text>
        </ToastBody>
      </Toast>,
      {
        toastId,
        politeness: 'polite',
        position: 'top-end',
        timeout: -1,
      }
    );
  }, [dispatchToast, resources.LastSaved, resources.Status, resources.TemplateInformation, resources.Type, statusText, toastId, type]);

  return <Toaster toasterId={toasterId} />;
};

export const DismissableSuccessToast = ({ title, content, show }: { title: string; content: string; show: boolean }) => {
  const toastId = useId('template-success-toast');
  const toasterId = useId('template-success-toaster');

  const { dispatchToast } = useToastController(toasterId);
  useEffect(() => {
    if (show) {
      dispatchToast(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          <ToastBody>{content}</ToastBody>
        </Toast>,
        { intent: 'success', position: 'top-end', timeout: 20000, toastId }
      );
    }
  }, [content, dispatchToast, show, title, toastId]);

  return <Toaster toasterId={toasterId} />;
};
