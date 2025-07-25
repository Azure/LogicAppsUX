import { useEffect, useRef } from 'react';
import { StatusPill } from '../../monitoring';
import NodeCollapseToggle from '../../nodeCollapseToggle';
import { ErrorBanner } from '../errorbanner';
import { useCardKeyboardInteraction } from '../hooks';
import { Gripper } from '../images/dynamicsvgs/gripper';
import type { CardProps } from '../index';
import { css, Icon } from '@fluentui/react';
import { Badge, Spinner, Tooltip, useRestoreFocusTarget } from '@fluentui/react-components';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

export interface ScopeCardProps extends CardProps {
  collapsed?: boolean;
  handleCollapse?: () => void;
  timelineRepetitionCount?: number;
}

export const ScopeCard: React.FC<ScopeCardProps> = ({
  id,
  active = true,
  brandColor,
  collapsed,
  commentBox,
  drag,
  draggable,
  dragPreview,
  errorLevel,
  errorMessage,
  icon,
  isLoading,
  title,
  onClick,
  onContextMenu,
  onDeleteClick,
  handleCollapse,
  selectionMode,
  runData,
  setFocus,
  nodeIndex,
  showStatusPill,
  timelineRepetitionCount = 0,
}) => {
  const focusRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusTargetAttribute = useRestoreFocusTarget();

  const handleClick: React.MouseEventHandler<HTMLElement> = () => {
    onClick?.();
  };
  useEffect(() => {
    if (setFocus) {
      focusRef.current?.focus();
    }
  }, [setFocus]);
  const keyboardInteraction = useCardKeyboardInteraction(onClick, onDeleteClick);

  const badges = [
    ...(commentBox && commentBox.comment
      ? [{ title: 'Comment', content: commentBox.comment, darkBackground: true, iconProps: { iconName: 'Comment' }, active }]
      : []),
  ];

  const intl = useIntl();

  const cardAltText = intl.formatMessage(
    {
      defaultMessage: '{title} operation',
      id: 'Aui3Mq',
      description: 'Alt text on action card including the operation name',
    },
    {
      title,
    }
  );

  const colorVars = { ['--brand-color' as any]: brandColor };
  const cardIcon = isLoading ? (
    <Spinner className="msla-card-header-spinner" size={'tiny'} appearance="inverted" />
  ) : icon ? (
    <img className="scope-icon" alt="" role="presentation" src={icon} />
  ) : null;

  return (
    <div ref={dragPreview} className="msla-content-fit" style={{ cursor: 'default' }}>
      <div className={'msla-content-fit'} aria-label={title}>
        <div
          ref={drag}
          data-automation-id={`card-${replaceWhiteSpaceWithUnderscore(title)}`}
          draggable={draggable}
          style={colorVars}
          onContextMenu={onContextMenu}
          className={css('msla-scope-v2--header msla-scope-card-wrapper', !active && 'msla-card-inactive')}
        >
          {showStatusPill ? (
            <StatusPill
              id={`${title}-status`}
              status={runData?.status}
              duration={runData?.duration}
              startTime={runData?.startTime}
              endTime={runData?.endTime}
            />
          ) : null}
          <div className="msla-scope-card-content">
            <div className={css('msla-selection-box', 'white-outline', selectionMode)} />
            <button
              {...restoreFocusTargetAttribute}
              id={`msla-node-${id}`}
              name={title}
              className="msla-scope-card-title-button"
              ref={focusRef as any}
              onClick={handleClick}
              onKeyDown={keyboardInteraction.keyDown}
              onKeyUp={keyboardInteraction.keyUp}
              tabIndex={nodeIndex}
              aria-label={cardAltText}
            >
              <div className="msla-scope-card-title-box">
                <div className={css('gripper-section', draggable && 'draggable')}>{draggable ? <Gripper /> : null}</div>
                <div className="panel-card-content-icon-section">{cardIcon}</div>
                <div className="msla-scope-title">{title}</div>
                {timelineRepetitionCount > 1 ? (
                  <Badge appearance="filled" size="small" shape="rounded">
                    #{timelineRepetitionCount}
                  </Badge>
                ) : null}
              </div>
              {errorMessage ? <ErrorBanner errorLevel={errorLevel} errorMessage={errorMessage} /> : null}
            </button>
            <NodeCollapseToggle id={id} collapsed={collapsed} handleCollapse={handleCollapse} tabIndex={nodeIndex} />
          </div>
          {badges.length > 0 && (
            <div className="msla-card-v2-footer" onClick={handleClick}>
              <div className="msla-badges">
                {badges.map(({ title, content, darkBackground, iconProps }) => (
                  <Tooltip key={title} relationship={'label'} withArrow={true} content={content}>
                    <div>
                      <Icon
                        className={css('panel-card-v2-badge', 'active', darkBackground && 'darkBackground')}
                        {...iconProps}
                        aria-label={`${title}: ${content}`}
                        tabIndex={nodeIndex}
                      />
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
