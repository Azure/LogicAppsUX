import { Gripper } from '../images/dynamicsvgs/gripper';
import type { CardProps } from '../index';
import { css, DirectionalHint, Icon, TooltipHost } from '@fluentui/react';

const scopeIcon =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzhDMzkwMCIvPg0KIDxwYXRoIGQ9Im04IDEwaDE2djEyaC0xNnptMTUgMTF2LTEwaC0xNHYxMHptLTItOHY2aC0xMHYtNnptLTEgNXYtNGgtOHY0eiIgZmlsbD0iI2ZmZiIvPg0KPC9zdmc+DQo=';

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
  selected,
  title,
  onClick,
  onCollapse,
}) => {
  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };

  const handleCollapse = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();

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
      ? [{ title: 'Comment', content: commentBox.comment, darkBackground: true, iconProps: { iconName: 'Comment' }, active: true }]
      : []),
  ];
  const cardStyle = { width: '100%', height: '100%', 'z-index': 100 };
  return (
    <div ref={dragPreview} style={cardStyle}>
      <div ref={drag} aria-describedby={describedBy} aria-label={title} style={cardStyle} role="button" onClick={handleClick} tabIndex={0}>
        <div className="msla-scope-v2--header" style={{ border: `2px solid #8c3900` }}>
          <button className="msla-inner" style={{ backgroundColor: brandColor, width: '100%', height: 50 }}>
            <button className="msla-selector" draggable={true} tabIndex={-1}>
              <div className="panel-card-content-gripper-section">{draggable ? <Gripper fill={'#FFFFF'} /> : null}</div>
              {scopeIcon && <img alt="" role="presentation" src={scopeIcon} width="24" height="24" />}
              <span>{title}</span>
            </button>
            <TooltipHost content={toggleText} directionalHint={DirectionalHint.rightCenter}>
              <button aria-label={toggleText} className="msla-toggle" onClick={handleCollapse}>
                <Icon iconName={iconName} />
              </button>
            </TooltipHost>
          </button>
          <div>
            <div className="msla-badges" style={{ backgroundColor: brandColor }}>
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
