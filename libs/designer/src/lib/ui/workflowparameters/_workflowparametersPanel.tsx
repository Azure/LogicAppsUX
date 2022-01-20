import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Spinner } from '@fluentui/react/lib/Spinner';
import * as React from 'react';
import { ErrorBoundary } from '../errorboundary';
import { WorkflowParametersProps } from './_workflowparameters';

type DismissHandler = () => void;
type ConfirmDismissHandler = () => Promise<boolean>;

const styles = {
  spinner: {
    root: {
      alignSelf: 'center' as any,
      margin: '10% 0',
      backgroundColor: 'transparent',
    },
    circle: {
      width: 70,
      height: 70,
      borderWidth: 8,
    },
  },
};

const WorkflowParameters = React.lazy(() => import('./_workflowparameters'));

export interface WorkflowParametersPanelProps extends WorkflowParametersProps {
  onDismiss: DismissHandler;
  isOpen: boolean;
  setIsOpen(open: boolean): void;
  onConfirmDismiss?: ConfirmDismissHandler;
}

export default function WorkflowParametersPanel({
  onDismiss,
  isOpen,
  setIsOpen,
  onConfirmDismiss,
  ...props
}: WorkflowParametersPanelProps): JSX.Element {
  const _hidePanel = async (): Promise<void> => {
    if (onConfirmDismiss && _hasEmptyParameterNames()) {
      if (await onConfirmDismiss()) {
        _dismissPanel();
      } else {
        setIsOpen(false);
      }
    } else {
      _dismissPanel();
    }
  };

  const _dismissPanel = (): void => {
    onDismiss();
    setIsOpen(false);
  };

  const _hasEmptyParameterNames = (): boolean => {
    return props.parameters.some((parameter) => !parameter.name);
  };

  return (
    <Panel isOpen={isOpen} type={PanelType.medium} onDismiss={_hidePanel} closeButtonAriaLabel={'Panel Close'}>
      <ErrorBoundary className="msla-workflow-parameters-error">
        <React.Suspense fallback={<Spinner styles={styles.spinner} />}>
          <WorkflowParameters {...props} />
        </React.Suspense>
      </ErrorBoundary>
    </Panel>
  );
}
