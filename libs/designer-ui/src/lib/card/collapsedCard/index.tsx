/* eslint-disable react/display-name */
import { css } from '@fluentui/react';
import type { MouseEventHandler } from 'react';
import { memo } from 'react';
import { useIntl } from 'react-intl';

interface CollapsedCardProps {
  id: string;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  actionCount: number;
}

export const CollapsedCard: React.FC<CollapsedCardProps> = memo(({ id, onContextMenu, actionCount }) => {
  const intl = useIntl();

  const actionString = intl.formatMessage(
    {
      defaultMessage: '{actionCount, plural, one {# Action} =0 {0 Actions} other {# Actions}}',
      id: 'B/JzwK',
      description: 'This is the number of actions to be completed in a group',
    },
    { actionCount }
  );
  return (
    <div id={id} onContextMenu={onContextMenu} className={css('msla-graph-container')}>
      <p className="no-actions-text" data-automation-id={`collapsed-text-${id}`}>
        {actionString}
      </p>
    </div>
  );
});
