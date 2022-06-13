import { ActionButtonV2 } from '../../actionbuttonv2';
import CollapseToggle from '../../collapseToggle';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

interface SubgraphHeaderProps {
  parentId: string;
  subgraphType: SubgraphType;
  title?: string;
  collapsed?: boolean;
  handleCollapse?: (event: { currentTarget: any }) => void;
  onClick?(id: string): void;
  showAddButton?: boolean;
}

export const SubgraphHeader: React.FC<SubgraphHeaderProps> = ({
  parentId,
  subgraphType,
  title = 'undefined',
  collapsed,
  handleCollapse,
  onClick,
}) => {
  const intl = useIntl();

  if (subgraphType === 'SWITCH-ADD-CASE') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', marginTop: '16px' }}>
        <ActionButtonV2 title={'Add Case'} />
      </div>
    );
  }

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

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    if (subgraphType !== 'SWITCH-CASE') {
      onClick?.(parentId);
    } else {
      onClick?.(title);
    }
  };

  return (
    <div className="msla-subgraph-header" style={{ ['--main-color' as any]: SubgraphTypeData[subgraphType].color }}>
      <div className="msla-subgraph-title" onClick={handleClick}>
        {SubgraphTypeData[subgraphType].title}
      </div>
      <CollapseToggle collapsed={collapsed} handleCollapse={handleCollapse} />
    </div>
  );
};
