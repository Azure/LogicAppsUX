import * as React from 'react';
import EmptyPanel from '../images/empty-panel.svg';
import { FormattedMessage } from 'react-intl';

export const EmptyContent = (): JSX.Element => {
  return (
    <div className="msla-panel-select-card-container-empty">
      <img src={EmptyPanel} alt="" />
      <div className="msla-panel-empty-text">
        <FormattedMessage defaultMessage="Please select a card to see the content" description="Empty Panel Content Message" />
      </div>
    </div>
  );
};
