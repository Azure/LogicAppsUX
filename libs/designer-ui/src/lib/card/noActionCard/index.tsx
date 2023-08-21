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
        className="msla-panel-card-container msla-panel-card-container--no-action"
        data-testid={`card-${triggerTitle}`}
        data-automation-id={`card-${convertUIElementNameToAutomationId(triggerTitle)}`}
        tabIndex={0}
      >
        <div className="msla-selection-box" />
        <div className="panel-card-main">
          <div className="panel-card-header" role="button">
            <div className="panel-card-content-container">
              <div className="panel-card-top-content panel-card-top-content--no-action">
                <div className="panel-msla-title">{triggerTitle}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
