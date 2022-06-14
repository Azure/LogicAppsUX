import { ActionButtonV2 } from '../../actionbuttonv2';
import CollapseToggle from '../../collapseToggle';
import { css } from '@fluentui/react';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

interface SubgraphHeaderProps {
  parentId: string;
  subgraphType: SubgraphType;
  title?: string;
  collapsed?: boolean;
  readOnly?: boolean;
  handleCollapse?: (event: { currentTarget: any }) => void;
  onClick?(id: string): void;
  showAddButton?: boolean;
}

export const SubgraphHeader: React.FC<SubgraphHeaderProps> = ({
  parentId,
  subgraphType,
  title = 'undefined',
  collapsed,
  readOnly = false,
  handleCollapse,
  onClick,
}) => {
  const intl = useIntl();

  if (subgraphType === 'SWITCH-ADD-CASE') {
    if (readOnly) return null;
    return (
      <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', marginTop: '24px' }}>
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
      classes: ['large'],
    },
    'SWITCH-DEFAULT': {
      color: '#484F58',
      title: intl.formatMessage({
        defaultMessage: 'Default',
        description: 'Default, the backup option if none other apply',
      }),
    },
  } as any;

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    if (subgraphType !== 'SWITCH-CASE') {
      onClick?.(parentId);
    } else {
      onClick?.(title);
    }
  };

  const data = SubgraphTypeData[subgraphType];

  return (
    <div
      className={css('msla-subgraph-header', ...(data?.classes ?? []))}
      style={{ ['--main-color' as any]: SubgraphTypeData[subgraphType].color }}
    >
      <div className="msla-subgraph-title" onClick={handleClick}>
        {data.title}
      </div>
      <CollapseToggle collapsed={collapsed} handleCollapse={handleCollapse} />
    </div>
  );
};
