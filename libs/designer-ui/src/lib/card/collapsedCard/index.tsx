/* eslint-disable react/display-name */
import { css } from '@fluentui/react';
import type { MouseEventHandler } from 'react';
import { memo } from 'react';
import { useIntl } from 'react-intl';

interface CollapsedCardProps {
  id: string;
  onContextMenu?: MouseEventHandler<HTMLElement>;
}

export const CollapsedCard: React.FC<CollapsedCardProps> = memo(({ id, onContextMenu }) => {
  const intl = useIntl();

  const actionString = intl.formatMessage({
    defaultMessage: 'Collapsed action',
    id: 'uGKFah',
    description: 'Collapsed action text',
  });

  return (
    <div id={id} onContextMenu={onContextMenu} className={css('msla-graph-container')}>
      <p className="no-actions-text" data-automation-id={`collapsed-text-${id}`}>
        {actionString}
      </p>
    </div>
  );
});
