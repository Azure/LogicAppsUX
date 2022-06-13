import CollapseToggle from '../../collapseToggle';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

interface SubgraphHeaderProps {
  subgraphType: SubgraphType;
  name?: string;
  collapsed?: boolean;
  handleCollapse?: (event: { currentTarget: any }) => void;
}

export const SubgraphHeader: React.FC<SubgraphHeaderProps> = ({ subgraphType, name, collapsed, handleCollapse }) => {
  const intl = useIntl();

  const CASE_STRING = intl.formatMessage({
    defaultMessage: 'Case',
    description: 'Case, as in Case A / Case B / Case C',
  });

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
      color: '#828282',
      title: `${CASE_STRING}-${name}`,
    },
    'SWITCH-DEFAULT': {
      color: '#828282',
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
