import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { Spinner } from '@fluentui/react/lib/Spinner';
import * as React from 'react';
// import Resources from 'resources';
import { ErrorBoundary } from '../errorboundary';
import { WorkflowParametersProps } from './_workflowparameters';

type DismissHandler = () => void;
type ConfirmDismissHandler = () => Promise<boolean>;

const styles = {
  spinner: {
    root: {
      alignSelf: 'center' as any /* tslint:disable-line: no-any */,
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
  onConfirmDismiss?: ConfirmDismissHandler;
}

export interface WorkflowParametersPanelState {
  showPanel: boolean;
}

export class WorkflowParametersPanel extends React.Component<WorkflowParametersPanelProps, WorkflowParametersPanelState> {
  state = {
    showPanel: false,
  };

  showPanel() {
    this.setState({ showPanel: true });
  }

  render() {
    return (
      <Panel isOpen={this.state.showPanel} type={PanelType.medium} onDismiss={this._hidePanel} closeButtonAriaLabel={'Panel Close'}>
        <ErrorBoundary className="msla-workflow-parameters-error">
          <React.Suspense fallback={<Spinner styles={styles.spinner} />}>
            <WorkflowParameters {...this.props} />
          </React.Suspense>
        </ErrorBoundary>
      </Panel>
    );
  }

  private _hidePanel = async (): Promise<void> => {
    const { onConfirmDismiss } = this.props;
    if (onConfirmDismiss && this._hasEmptyParameterNames()) {
      if (await onConfirmDismiss()) {
        this._dismissPanel();
      } else {
        this.setState({ showPanel: true });
      }
    } else {
      this._dismissPanel();
    }
  };

  private _dismissPanel = (): void => {
    this.props.onDismiss();
    this.setState({ showPanel: false });
  };

  private _hasEmptyParameterNames = (): boolean => {
    return this.props.parameters.some((parameter) => !parameter.name);
  };
}
