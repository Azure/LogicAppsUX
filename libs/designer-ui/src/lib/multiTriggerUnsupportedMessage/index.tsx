import { Button, Text } from '@fluentui/react-components';
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

  const consumptionMessage = intl.formatMessage({
    defaultMessage: 'The designer does not support workflows with multiple triggers. Use Run details to view this run.',
    id: 'AdZ/11',
    description:
      'Message shown instead of the designer canvas when a Consumption workflow definition has more than one trigger. The backend supports the workflow, but the designer cannot render it.',
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

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <Text className={styles.message}>{isStandard ? standardMessage : consumptionMessage}</Text>
        {!isStandard && onRunDetailsClick ? (
          <Button appearance="primary" onClick={onRunDetailsClick}>
            {runDetailsButtonText}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
