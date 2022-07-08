import CollapseToggle from '../../collapseToggle';
import { StatusPill } from '../../monitoring';
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
  icon,
  isMonitoringView,
  isLoading,
  title,
  onClick,
  handleCollapse,
  selected,
}) => {
  const handleClick: React.MouseEventHandler<HTMLElement> = () => {
    onClick?.();
  };

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
        <div ref={drag} className="msla-scope-v2--header msla-scope-card-wrapper" draggable={draggable} style={colorVars}>
          {isMonitoringView ? <StatusPill id={`${title}-status`} status={'Succeeded'} duration={'0s'} /> : null}
          <div className="msla-scope-card-content">
            <div className={css('msla-selection-box', 'white-outline', selected && 'selected')} />
            <button className="msla-scope-card-title-box" onClick={handleClick}>
              <div className={css('gripper-section', draggable && 'draggable')}>{draggable ? <Gripper /> : null}</div>
              {cardIcon}
              <div className="msla-scope-title">{title}</div>
            </button>
            <CollapseToggle collapsed={collapsed} handleCollapse={handleCollapse} />
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
      </div>
    </div>
  );
};
