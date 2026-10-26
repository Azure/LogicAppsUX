import { Button, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useMultiTriggerUnsupportedMessageStyles } from './styles';

export { useMultiTriggerUnsupportedMessageStyles } from './styles';

export interface MultiTriggerUnsupportedMessageProps {
  /**
   * True when the workflow runs on Logic Apps Standard, which does not support multi-trigger
   * definitions at all (as opposed to Consumption, where the backend supports them but the
   * designer/monitoring UI does not). Standard never shows the Run details fallback action.
   */
  isStandard: boolean;
  /**
   * Called when the user clicks "Run details". Only supplied (and therefore only rendered) for
   * Consumption workflows in monitoring/run-history mode.
   */
  onRunDetailsClick?: () => void;
}

/**
 * Centered, stateless replacement for the designer canvas shown when a workflow definition has
 * more than one trigger. Rendered instead of initializing any graph/designer state, since neither
 * the Consumption nor Standard designer/monitoring experiences support such definitions.
 */
export const MultiTriggerUnsupportedMessage: React.FC<MultiTriggerUnsupportedMessageProps> = ({ isStandard, onRunDetailsClick }) => {
  const styles = useMultiTriggerUnsupportedMessageStyles();
  const intl = useIntl();

  const consumptionDesignMessage = intl.formatMessage({
    defaultMessage: 'The designer does not support workflows with multiple triggers.',
    id: '+PAY/q',
    description:
      'Message shown instead of the designer canvas when a Consumption workflow definition has more than one trigger and no run is selected (design mode). The backend supports the workflow, but the designer cannot render it.',
  });

  const consumptionMonitoringMessage = intl.formatMessage({
    defaultMessage: 'The designer does not support workflows with multiple triggers. Use Run details to view this run.',
    id: '9iYe3N',
    description:
      'Message shown instead of the designer canvas when a Consumption workflow definition has more than one trigger and a run is selected in monitoring view. The backend supports the workflow, but the designer cannot render it; the Run details action opens the full run experience.',
  });

  const standardMessage = intl.formatMessage({
    defaultMessage: 'Azure Logic Apps (Standard) does not support workflows with multiple triggers.',
    id: 'Zfz/Ay',
    description:
      'Message shown instead of the designer canvas when a Standard workflow definition has more than one trigger. Standard does not support such workflows at all.',
  });

  const runDetailsButtonText = intl.formatMessage({
    defaultMessage: 'Run details',
    id: 'WCljbe',
    description: 'Text for a button that opens the run details experience for a workflow the designer cannot render',
  });

  const titleText = intl.formatMessage({
    defaultMessage: 'Workflow not supported in designer',
    id: 'rQ9u5v',
    description:
      'Title of the message shown instead of the designer canvas when a workflow definition has more than one trigger. The workflow itself may still be supported by the backend/runtime; only the designer/monitoring UI cannot render it.',
  });

  const showRunDetailsAction = !isStandard && Boolean(onRunDetailsClick);

  const bodyMessage = isStandard ? standardMessage : showRunDetailsAction ? consumptionMonitoringMessage : consumptionDesignMessage;

  return (
    <div className={styles.root}>
      <MessageBar intent={isStandard ? 'warning' : 'info'} layout="multiline" className={styles.content}>
        <MessageBarBody>
          <MessageBarTitle>{titleText}</MessageBarTitle>
          {bodyMessage}
        </MessageBarBody>
        {showRunDetailsAction ? (
          <MessageBarActions>
            <Button appearance="primary" onClick={onRunDetailsClick}>
              {runDetailsButtonText}
            </Button>
          </MessageBarActions>
        ) : null}
      </MessageBar>
    </div>
  );
};
