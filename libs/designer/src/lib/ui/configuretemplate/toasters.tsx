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
  type ToastOffset,
} from '@fluentui/react-components';
import { useEffect, useMemo } from 'react';
import { useResourceStrings } from './resources';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/templates/store';
import { useTemplatesStrings } from '../templates/templatesStrings';

export interface TemplateInfoToasterProps {
  title: string;
  content: string;
  show: boolean;
  offset?: ToastOffset;
}

export const TemplateInfoToast = ({ title, content, show, offset }: TemplateInfoToasterProps) => {
  const toastId = useId('template-info-toast');
  const toasterId = useId('template-info-toaster');

  const customStrings = useResourceStrings();
  const { resourceStrings } = useTemplatesStrings();
  const { workflows, status } = useSelector((state: RootState) => state.template);
  const type = useMemo(() => {
    const workflowKeys = Object.keys(workflows);
    return workflowKeys.length === 1
      ? resourceStrings.WORKFLOW
      : workflowKeys.length > 1
        ? resourceStrings.ACCELERATOR
        : customStrings.Placeholder;
  }, [workflows, customStrings, resourceStrings]);
  const statusText = useMemo(
    () =>
      status === 'Production'
        ? customStrings.ProductionEnvironment
        : status === 'Testing'
          ? customStrings.TestingEnvironment
          : customStrings.DevelopmentEnvironment,
    [customStrings, status]
  );

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
    () => dispatchToast(<InfoToastContent type={type} status={statusText} lastSaved={customStrings.Placeholder} />, toastDetails),
    [dispatchToast, statusText, toastDetails, toastId, type, customStrings.Placeholder]
  );

  useEffect(() => {
    if (!show) {
      updateToast({
        content: <InfoToastContent type={type} status={statusText} lastSaved={customStrings.Placeholder} />,
        ...toastDetails,
      });
    }
  }, [show, statusText, toastDetails, toastId, type, updateToast, customStrings.Placeholder]);

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
        timeout: 10000,
      });
    }
  }, [content, show, title, toastDetails, updateToast]);

  return <Toaster toasterId={toasterId} offset={offset ? offset : { horizontal: 30, vertical: -10 }} />;
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
