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
  operationVisuals?: any;
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

  const expandingString = intl.formatMessage({
    defaultMessage: 'Expanding actions...',
    id: 'LuIkbo',
    description: 'This is the text that is displayed when the user is expanding collapsed actions',
  });

  return (
    <div
      id={id}
      onContextMenu={onContextMenu}
      className={css('msla-graph-container')}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {isExpanding ? (
        <Text className="no-actions-text" style={{ display: 'flex', justifyContent: 'center' }} data-automation-id={`collapsed-text-${id}`}>
          {expandingString}
        </Text>
      ) : (
        <>
          {(operationVisuals ?? []).map((operationVisual: any, index: any) => {
            return <img key={index} style={{ width: '24px', height: '24px', margin: '3px' }} src={operationVisual.iconUri} alt="" />;
          })}
          {actionCount <= 0 ? null : <Text data-automation-id={`collapsed-text-${id}`}>{actionString}</Text>}
        </>
      )}
    </div>
  );
});
