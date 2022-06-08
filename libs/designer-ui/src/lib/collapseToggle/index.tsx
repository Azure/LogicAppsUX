import { TooltipHost, DirectionalHint, Icon } from '@fluentui/react';
import { FontSizes } from '@fluentui/theme';

interface CollapseToggleProps {
  collapsed?: boolean;
  handleCollapse?: (event: { currentTarget: any }) => void;
}

const CollapseToggle = (props: CollapseToggleProps) => {
  const { collapsed = false, handleCollapse } = props;

  const iconName = collapsed ? 'ChevronDown' : 'ChevronUp';
  const toggleText = collapsed ? 'Expand' : 'Collapse';

  return (
    <TooltipHost content={toggleText} directionalHint={DirectionalHint.rightCenter}>
      <button aria-label={toggleText} className="msla-collapse-toggle" onClick={handleCollapse}>
        <Icon iconName={iconName} styles={{ root: { fontSize: FontSizes.small } }} />
      </button>
    </TooltipHost>
  );
};

export default CollapseToggle;
