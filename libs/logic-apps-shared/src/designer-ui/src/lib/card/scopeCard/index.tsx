import { StatusPill } from '../../monitoring';
import NodeCollapseToggle from '../../nodeCollapseToggle';
import { CardContextMenu } from '../cardcontextmenu';
import { ErrorBanner } from '../errorbanner';
import { useCardContextMenu, useCardKeyboardInteraction } from '../hooks';
import { Gripper } from '../images/dynamicsvgs/gripper';
import type { CardProps } from '../index';
import { css, Icon, Spinner, SpinnerSize, TooltipHost } from '@fluentui/react';

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
  runData = {},
}) => {
  const contextMenu = useCardContextMenu();

  const handleClick: React.MouseEventHandler<HTMLElement> = () => {
    onClick?.();
  };

  const keyboardInteraction = useCardKeyboardInteraction(onClick, onDeleteClick);

  const badges = [
    ...(commentBox && commentBox.comment
      ? [{ title: 'Comment', content: commentBox.comment, darkBackground: true, iconProps: { iconName: 'Comment' }, active }]
      : []),
  ];

  const colorVars = { ['--brand-color' as any]: brandColor };
  const cardIcon = isLoading ? (
    <Spinner className="msla-card-header-spinner" size={SpinnerSize.small} />
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
              status={runData.status}
              duration={runData.duration}
              startTime={runData.startTime}
              endTime={runData.endTime}
            />
          ) : null}
          <div className="msla-scope-card-content">
            <div className={css('msla-selection-box', 'white-outline', selected && 'selected')} />
            <button className="msla-scope-card-title-button" onClick={handleClick}>
              <div className="msla-scope-card-title-box">
                <div className={css('gripper-section', draggable && 'draggable')}>{draggable ? <Gripper /> : null}</div>
                {cardIcon}
                <div className="msla-scope-title">{title}</div>
              </div>
              {errorMessage ? <ErrorBanner errorLevel={errorLevel} errorMessage={errorMessage} /> : null}
            </button>
            <NodeCollapseToggle collapsed={collapsed} handleCollapse={handleCollapse} />
          </div>
          <div>
            <div className="msla-badges">
              {badges.map(({ title, content, darkBackground, iconProps }) => (
                <TooltipHost key={title} content={content}>
                  <Icon
                    className={css('panel-card-v2-badge', 'active', darkBackground && 'darkBackground')}
                    {...iconProps}
                    ariaLabel={`${title}: ${content}`}
                    tabIndex={0}
                  />
                </TooltipHost>
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
