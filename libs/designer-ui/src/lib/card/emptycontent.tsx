import EmptyPanel from './images/empty-panel.svg';
import { useIntl } from 'react-intl';

export const EmptyContent: React.FC = () => {
  const intl = useIntl();
  const emptyContentMessage = intl.formatMessage({
    defaultMessage: 'Please select a card to see the content',
    description: 'Empty Panel Content Message',
  });
  return (
    <div className="msla-panel-select-card-container-empty">
      <img src={EmptyPanel} alt="" role="presentation" />
      <div className="msla-panel-empty-text">{emptyContentMessage}</div>
    </div>
  );
};
