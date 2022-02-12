import { FormattedMessage } from 'react-intl';
import EmptyPanel from '../images/empty-panel.svg';

export const EmptyContent: React.FC = () => {
  return (
    <div className="msla-panel-select-card-container-empty">
      <img src={EmptyPanel} alt="" role="presentation" />
      <div className="msla-panel-empty-text">
        <FormattedMessage defaultMessage="Please select a card to see the content" description="Empty Panel Content Message" />
      </div>
    </div>
  );
};
