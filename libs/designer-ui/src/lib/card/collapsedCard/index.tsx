/* eslint-disable react/display-name */
import type { MouseEventHandler } from 'react';
import { memo, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { Text, useRestoreFocusTarget } from '@fluentui/react-components';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';

interface CollapsedCardProps {
  id: string;
  actionCount: number;
  isExpanding: boolean;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  operationVisuals?: Array<{
    id: string;
    iconUri: string;
    brandColor: string;
  }>;
  setFocus?: boolean;
  nodeIndex?: number;
}

export const CollapsedCard: React.FC<CollapsedCardProps> = memo(
  ({ id, onContextMenu, actionCount, isExpanding, operationVisuals, setFocus, nodeIndex }) => {
    const intl = useIntl();
    const focusRef = useRef<HTMLElement | null>(null);
    const restoreFocusTargetAttribute = useRestoreFocusTarget();

    useEffect(() => {
      if (setFocus) {
        focusRef.current?.focus();
      }
    }, [setFocus]);

    const actionString = intl.formatMessage(
      {
        defaultMessage: '+ {actionCount}',
        id: 'nCvjDp',
        description: 'Displays the collapsed action count with a plus sign',
      },
      { actionCount }
    );

    const ariaLabelCollapsed = intl.formatMessage(
      {
        defaultMessage:
          '{actionCount, plural, one {Collapsed card with # action} =0 {Collapsed card with 0 Actions} other {Collapsed card with # actions}}',
        id: 'NNCFBV',
        description: 'Accessibility label for collapsed card with action count',
      },
      { actionCount: actionCount + 3 }
    );

    const expandingString = intl.formatMessage({
      defaultMessage: 'Expanding actions...',
      id: 'LuIkbo',
      description: 'This is the text that is displayed when the user is expanding collapsed actions',
    });

    const operationId = replaceWhiteSpaceWithUnderscore(id);

    return (
      <div
        {...restoreFocusTargetAttribute}
        ref={(node) => {
          focusRef.current = node;
        }}
        id={`msla-collapsed-card-${operationId}`}
        data-automation-id={`msla-collapsed-card-${operationId}`}
        onContextMenu={onContextMenu}
        className="msla-collapsed-card"
        aria-label={ariaLabelCollapsed}
        tabIndex={nodeIndex}
      >
        {isExpanding ? (
          <Text className="no-actions-text" align="center" data-automation-id={`collapsed-text-${operationId}`}>
            {expandingString}
          </Text>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {(operationVisuals ?? []).map((operationVisual, index: number) => {
              return (
                <img
                  key={index}
                  className="msla-collapsed-card__icon"
                  src={operationVisual.iconUri}
                  aria-label={`${operationVisual.id} operation icon`}
                  alt=""
                />
              );
            })}
            {actionCount <= 0 ? null : <Text data-automation-id={`collapsed-text-${operationId}`}>{actionString}</Text>}
          </div>
        )}
      </div>
    );
  }
);
