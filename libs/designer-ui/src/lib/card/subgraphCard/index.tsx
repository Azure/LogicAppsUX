import { ActionButtonV2 } from '../../actionbuttonv2';
import CollapseToggle from '../../collapseToggle';
import { css } from '@fluentui/react';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { SUBGRAPH_TYPES } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

interface SubgraphCardProps {
  id: string;
  parentId: string;
  subgraphType: SubgraphType;
  collapsed?: boolean;
  handleCollapse?: (event: { currentTarget: any }) => void;
  selected?: boolean;
  readOnly?: boolean;
  onClick?(id: string): void;
  showAddButton?: boolean;
}

export const SubgraphCard: React.FC<SubgraphCardProps> = ({
  id,
  parentId,
  subgraphType,
  collapsed,
  handleCollapse,
  selected = false,
  readOnly = false,
  onClick,
}) => {
  const intl = useIntl();

  if (subgraphType === SUBGRAPH_TYPES['SWITCH_ADD_CASE']) {
    if (readOnly) return null;
    return (
      <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
        <ActionButtonV2 title={'Add Case'} />
      </div>
    );
  }

  const SubgraphTypeData: Record<SubgraphType, any> = {
    CONDITIONAL_TRUE: {
      color: '#428000',
      title: intl.formatMessage({
        defaultMessage: 'True',
        description: 'True',
      }),
      size: 'small',
      clickId: parentId,
    },
    CONDITIONAL_FALSE: {
      color: '#A4262C',
      title: intl.formatMessage({
        defaultMessage: 'False',
        description: 'False',
      }),
      size: 'small',
      clickId: parentId,
    },
    SWITCH_CASE: {
      color: '#484F58',
      title: id,
      size: 'large',
      clickId: id,
    },
    SWITCH_DEFAULT: {
      color: '#484F58',
      title: intl.formatMessage({
        defaultMessage: 'Default',
        description: 'Default, the backup option if none other apply',
      }),
      size: 'small',
      clickId: parentId,
    },
    UNTIL_DO: {
      color: '#486991',
      title: intl.formatMessage({
        defaultMessage: 'Do',
        description: 'Do, as in "to do an action"',
      }),
      size: 'small',
      clickId: id,
    },
    SWITCH_ADD_CASE: {},
  };

  const data = SubgraphTypeData[subgraphType];

  const handleTitleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.(data.clickId);
  };

  if (data.size === 'large') {
    return (
      <div
        className={css('msla-subgraph-card', data.size)}
        style={{ ['--main-color' as any]: SubgraphTypeData[subgraphType].color }}
        tabIndex={-1}
      >
        <div className={css('msla-selection-box', 'white-outline', selected && 'selected')} tabIndex={-1} />
        <button className="msla-subgraph-title" onClick={handleTitleClick}>
          {data.title}
        </button>
        <CollapseToggle collapsed={collapsed} handleCollapse={handleCollapse} />
      </div>
    );
  } else if (data.size === 'small') {
    return (
      <div style={{ width: 200, display: 'grid', placeItems: 'center' }}>
        <div
          tabIndex={0}
          className={css('msla-subgraph-card', data.size)}
          style={{ ['--main-color' as any]: SubgraphTypeData[subgraphType].color }}
          onClick={(e) => {
            handleTitleClick(e);
            handleCollapse?.(e);
          }}
        >
          <div className={css('msla-selection-box', 'white-outline', selected && 'selected')} tabIndex={-1} />
          <div className="msla-subgraph-title">{data.title}</div>
          <CollapseToggle disabled collapsed={collapsed} />
        </div>
      </div>
    );
  } else return null;
};
