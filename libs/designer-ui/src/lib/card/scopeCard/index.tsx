import { useEffect, useRef } from 'react';
import { StatusPill } from '../../monitoring';
import NodeCollapseToggle from '../../nodeCollapseToggle';
import { CardContextMenu } from '../cardcontextmenu';
import { ErrorBanner } from '../errorbanner';
import { useCardContextMenu, useCardKeyboardInteraction } from '../hooks';
import { Gripper } from '../images/dynamicsvgs/gripper';
import type { CardProps } from '../index';
import { css, Icon } from '@fluentui/react';
import { Spinner, Tooltip } from '@fluentui/react-components';

export interface ScopeCardProps extends CardProps {
  collapsed?: boolean;
  handleCollapse?: () => void;
}

export const ScopeCard: React.FC<ScopeCardProps> = ({
  active = true,
  brandColor,
  collapsed,
  commentBox,
  describedBy,
  drag,
  draggable,
  dragPreview,
  errorLevel,
  errorMessage,
  icon,
  isMonitoringView,
  isLoading,
  title,
  onClick,
  onDeleteClick,
  handleCollapse,
  selected,
  contextMenuItems = [],
  runData,
  setFocus,
}) => {
  const contextMenu = useCardContextMenu();
  const focusRef = useRef<HTMLDivElement | null>(null);
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

  const colorVars = { ['--brand-color' as any]: brandColor };
  const cardIcon = isLoading ? (
    <Spinner className="msla-card-header-spinner" size={'tiny'} appearance="inverted" />
  ) : icon ? (
    <img className="scope-icon" alt="" role="presentation" src={icon} />
  ) : null;
  return (
    <div ref={dragPreview} className="msla-content-fit" style={{ cursor: 'default' }}>
      <div aria-describedby={describedBy} className={'msla-content-fit'} aria-label={title}>
        <div
          ref={drag}
          className="msla-scope-v2--header msla-scope-card-wrapper"
          draggable={draggable}
          style={colorVars}
          onContextMenu={contextMenu.handle}
          onKeyDown={keyboardInteraction.keyDown}
          onKeyUp={keyboardInteraction.keyUp}
        >
          {isMonitoringView ? (
            <StatusPill
              id={`${title}-status`}
              status={runData?.status}
              duration={runData?.duration}
              startTime={runData?.startTime}
              endTime={runData?.endTime}
            />
          ) : null}
          <div className="msla-scope-card-content">
            <div className={css('msla-selection-box', 'white-outline', selected && 'selected')} />
            <button className="msla-scope-card-title-button" ref={focusRef as any} onClick={handleClick}>
              <div className="msla-scope-card-title-box">
                <div className={css('gripper-section', draggable && 'draggable')}>{draggable ? <Gripper /> : null}</div>
                <div className="panel-card-content-icon-section">{cardIcon}</div>
                <div className="msla-scope-title">{title}</div>
              </div>
              {errorMessage ? <ErrorBanner errorLevel={errorLevel} errorMessage={errorMessage} /> : null}
            </button>
            <NodeCollapseToggle collapsed={collapsed} handleCollapse={handleCollapse} />
          </div>
          <div className="msla-card-v2-footer" onClick={handleClick}>
            <div className="msla-badges">
              {badges.map(({ title, content, darkBackground, iconProps }) => (
                <Tooltip key={title} relationship={'label'} withArrow={true} content={content}>
                  <div>
                    <Icon
                      className={css('panel-card-v2-badge', 'active', darkBackground && 'darkBackground')}
                      {...iconProps}
                      aria-label={`${title}: ${content}`}
                      tabIndex={0}
                    />
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
        {contextMenuItems?.length > 0 ? (
          <CardContextMenu
            contextMenuLocation={contextMenu.location}
            menuItems={contextMenuItems}
            open={contextMenu.isShowing}
            title={title}
            setOpen={contextMenu.setIsShowing}
          />
        ) : null}
      </div>
    </div>
  );
};
