import { convertUIElementNameToAutomationId } from '../../utils';
import { useIntl } from 'react-intl';

export const NoActionCard: React.FC = () => {
  const intl = useIntl();

  const triggerTitle = intl.formatMessage({
    defaultMessage: 'No actions',
    description: 'Text on a no actions node',
  });

  return (
    <div style={{ position: 'relative' }}>
      <div
        aria-label={triggerTitle}
        className="msla-panel-card-container--no-action"
        data-testid={`card-${triggerTitle}`}
        data-automation-id={`card-${convertUIElementNameToAutomationId(triggerTitle)}`}
        tabIndex={0}
      >
        <div className="panel-card--no-action">
          <div className="panel-msla-title">{triggerTitle}</div>
        </div>
      </div>
    </div>
  );
};
