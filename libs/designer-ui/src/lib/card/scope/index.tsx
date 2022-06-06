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

  const colorVars = { ['--brand-color' as any]: brandColor };

  return (
    <div ref={dragPreview} className="msla-content-fit" style={{ cursor: 'default' }}>
      <div
        aria-describedby={describedBy}
        className={'msla-content-fit'}
        aria-label={title}
        role="button"
        onClick={handleClick}
        tabIndex={0}
      >
        <div ref={drag} className="msla-scope-v2--header msla-scope-header-wrapper" draggable={draggable} style={colorVars}>
          {isMonitoringView ? <StatusPill id={`${title}-status`} status={'Succeeded'} duration={'0s'} /> : null}
          <div className="msla-scope-header-content">
            <div className="msla-scope-header-title-box">
              <div className={css('gripper-section', draggable && 'draggable')}>{draggable ? <Gripper /> : null}</div>
              {icon ? <img className="scope-icon" alt="" role="presentation" src={icon} /> : null}
              <div className="msla-scope-title">{title}</div>
            </div>
            <TooltipHost content={toggleText} directionalHint={DirectionalHint.rightCenter}>
              <button aria-label={toggleText} className="collapse-toggle" onClick={handleCollapse}>
                <Icon iconName={iconName} />
              </button>
            </TooltipHost>
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
        <div className="msla-scope-v2--body msla-expanded" />
      </div>
    </div>
  );
};
