import CollapseToggle from '../../collapseToggle';
import type { SubgraphType } from '@microsoft-logic-apps/utils';

interface SubgraphHeaderProps {
  subgraphType: SubgraphType;
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
    'SWITCH-DEFAULT': {
      title: 'Default',
      color: '#828282',
    },
  };

  return (
    <div className="msla-subgraph-header" style={{ ['--main-color' as any]: SubgraphTypeData[subgraphType].color }}>
      <div className="msla-subgraph-title">{SubgraphTypeData[subgraphType].title}</div>
      <CollapseToggle collapsed={collapsed} handleCollapse={handleCollapse} />
    </div>
  );
};
