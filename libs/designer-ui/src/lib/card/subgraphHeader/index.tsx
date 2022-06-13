import CollapseToggle from '../../collapseToggle';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

interface SubgraphHeaderProps {
  subgraphType: SubgraphType;
  title?: string;
  collapsed?: boolean;
  handleCollapse?: (event: { currentTarget: any }) => void;
}

export const SubgraphHeader: React.FC<SubgraphHeaderProps> = ({ subgraphType, title, collapsed, handleCollapse }) => {
  const intl = useIntl();

  const SubgraphTypeData = {
    'CONDITIONAL-TRUE': {
      color: '#428000',
      title: intl.formatMessage({
        defaultMessage: 'True',
        description: 'True',
      }),
    },
    'CONDITIONAL-FALSE': {
      color: '#A4262C',
      title: intl.formatMessage({
        defaultMessage: 'False',
        description: 'False',
      }),
    },
    'SWITCH-CASE': {
      color: '#484F58',
      title: title,
    },
    'SWITCH-DEFAULT': {
      color: '#484F58',
      title: intl.formatMessage({
        defaultMessage: 'Default',
        description: 'Default, the backup option if none other apply',
      }),
    },
  };

  return (
    <div className="msla-subgraph-header" style={{ ['--main-color' as any]: SubgraphTypeData[subgraphType].color }}>
      <div className="msla-subgraph-title">{SubgraphTypeData[subgraphType].title}</div>
      <CollapseToggle collapsed={collapsed} handleCollapse={handleCollapse} />
    </div>
  );
};
