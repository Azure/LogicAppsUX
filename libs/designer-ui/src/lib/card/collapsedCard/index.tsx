/* eslint-disable react/display-name */
import { css } from '@fluentui/react';
import type { MouseEventHandler } from 'react';
import { memo } from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@fluentui/react-components';

interface CollapsedCardProps {
  id: string;
  actionCount: number;
  isExpanding: boolean;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  operationVisuals?: Array<{
    iconUri: string;
    brandColor: string;
  }>;
}

export const CollapsedCard: React.FC<CollapsedCardProps> = memo(({ id, onContextMenu, actionCount, isExpanding, operationVisuals }) => {
  const intl = useIntl();

  const actionString = intl.formatMessage(
    {
      defaultMessage: '+ {actionCount}',
      id: 'nCvjDp',
      description: 'Displays the collapsed action count with a plus sign',
    },
    { actionCount }
  );

  const ariaLabelIcons = intl.formatMessage(
    {
      defaultMessage: 'Collapsed card with {actionCount} actions',
      id: 'Z2Pi/A',
      description: 'Accessibility label for collapsed card with action count',
    },
    { actionCount }
  );

  const expandingString = intl.formatMessage({
    defaultMessage: 'Expanding actions...',
    id: 'LuIkbo',
    description: 'This is the text that is displayed when the user is expanding collapsed actions',
  });

  return (
    <div
      id={`msla-collapsed-card-${id}`}
      data-automation-id={`msla-collapsed-card-${id}`}
      onContextMenu={onContextMenu}
      className={css('msla-collapsed-card')}
    >
      {isExpanding ? (
        <Text className="no-actions-text" align="center" data-automation-id={`collapsed-text-${id}`}>
          {expandingString}
        </Text>
      ) : (
        <div aria-label={ariaLabelIcons}>
          {(operationVisuals ?? []).map((operationVisual, index: number) => {
            return <img key={index} className="msla-collapsed-card__icon" src={operationVisual.iconUri} alt="" />;
          })}
          {actionCount <= 0 ? null : <Text data-automation-id={`collapsed-text-${id}`}>{actionString}</Text>}
        </div>
      )}
    </div>
  );
});
