import { DirectionalHint, FontSizes, Icon, TooltipHost } from '@fluentui/react';

interface SubgraphHeaderProps {
  subgraphType: 'CONDITIONAL-TRUE' | 'CONDITIONAL-FALSE' | 'SWITCH-CASE';
  name?: string;
  collapsed?: boolean;
  handleCollapse?: (event: { currentTarget: any }) => void;
}

export const SubgraphHeader: React.FC<SubgraphHeaderProps> = ({ subgraphType, name, collapsed, handleCollapse }) => {
  const SubgraphTypeData = {
    'CONDITIONAL-TRUE': {
      title: 'True',
      color: '#428000',
    },
    'CONDITIONAL-FALSE': {
      title: 'False',
      color: '#A4262C',
    },
    'SWITCH-CASE': {
      title: `Case-${name}`,
      color: '#828282',
    },
  };

  const iconName = collapsed ? 'ChevronDown' : 'ChevronUp';
  const toggleText = collapsed ? 'Expand' : 'Collapse';

  const collapseIconStyles = {
    root: {
      fontSize: FontSizes.small,
    },
  };

  return (
    <div className="msla-subgraph-header" style={{ ['--main-color' as any]: SubgraphTypeData[subgraphType].color }}>
      <div className="msla-subgraph-title">{SubgraphTypeData[subgraphType].title}</div>
      <TooltipHost content={toggleText} directionalHint={DirectionalHint.rightCenter}>
        <button aria-label={toggleText} className="collapse-toggle" onClick={handleCollapse}>
          <Icon iconName={iconName} styles={collapseIconStyles} />
        </button>
      </TooltipHost>
    </div>
  );
};
