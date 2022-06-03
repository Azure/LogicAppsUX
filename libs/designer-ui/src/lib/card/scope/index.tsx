import { StatusPill } from '../../monitoring';
import { Gripper } from '../images/dynamicsvgs/gripper';
import type { CardProps } from '../index';
import { css, DirectionalHint, Icon, TooltipHost } from '@fluentui/react';

export interface ScopeCardProps extends CardProps {
  collapsed?: boolean;
  onCollapse?: (event: { currentTarget: any }) => void;
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
  isDragging,
  isMonitoringView,
  selected,
  title,
  onClick,
  onCollapse,
}) => {
  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    onClick?.();
  };

  const handleCollapse = (e: React.MouseEvent<HTMLButtonElement>): void => {
    if (onCollapse) {
      onCollapse({
        currentTarget: undefined,
      });
    }
  };

  const iconName = collapsed ? 'ChevronDown' : 'ChevronUp';
  const toggleText = collapsed ? 'Expand' : 'Collapse';
  const badges = [
    ...(commentBox && commentBox.comment
      ? [{ title: 'Comment', content: commentBox.comment, darkBackground: true, iconProps: { iconName: 'Comment' }, active }]
      : []),
  ];
  const bgStyle = { backgroundColor: brandColor };
  return (
    <div ref={dragPreview} className="msla-content-fit" style={{ cursor: 'default' }}>
      <div
        ref={drag}
        aria-describedby={describedBy}
        className={css('msla-content-fit', isDragging && 'dragging')}
        aria-label={title}
        tabIndex={0}
      >
        <div className="msla-scope-v2--header msla-scope-header-style" style={{ borderColor: brandColor }}>
          {isMonitoringView ? <StatusPill id={`${title}-status`} status={'Succeeded'} duration={'0s'} /> : null}
          <button className="msla-inner msla-scope-header-inner" style={bgStyle} onClick={handleClick}>
            <button className="msla-selector" draggable={true} tabIndex={-1}>
              <div className="panel-card-content-gripper-section">{draggable ? <Gripper fill={'#FFFFF'} /> : null}</div>
              {icon ? <img alt="" role="presentation" src={icon} width="24" height="24" /> : null}
              <span>{title}</span>
            </button>
            <TooltipHost content={toggleText} directionalHint={DirectionalHint.rightCenter}>
              <button aria-label={toggleText} className="msla-toggle" onClick={handleCollapse}>
                <Icon iconName={iconName} />
              </button>
            </TooltipHost>
          </button>
          <div>
            <div className="msla-badges" style={bgStyle}>
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
        <div className="msla-scope-v2--body msla-expanded" />
      </div>
    </div>
  );
};
