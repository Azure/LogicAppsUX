import { ActionButtonV2 } from '../../actionbuttonv2';
import CollapseToggle from '../../collapseToggle';
import { css } from '@fluentui/react';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { SUBGRAPH_TYPES } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

interface SubgraphCardProps {
  parentId: string;
  subgraphType: SubgraphType;
  title?: string;
  collapsed?: boolean;
  selected?: boolean;
  readOnly?: boolean;
  handleCollapse?: (event: { currentTarget: any }) => void;
  onClick?(id: string): void;
  showAddButton?: boolean;
}

export const SubgraphCard: React.FC<SubgraphCardProps> = ({
  subgraphType,
  title = 'undefined',
  collapsed,
  selected = false,
  readOnly = false,
  handleCollapse,
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
    },
    CONDITIONAL_FALSE: {
      color: '#A4262C',
      title: intl.formatMessage({
        defaultMessage: 'False',
        description: 'False',
      }),
      size: 'small',
    },
    SWITCH_CASE: {
      color: '#484F58',
      title: title,
      size: 'large',
    },
    SWITCH_DEFAULT: {
      color: '#484F58',
      title: intl.formatMessage({
        defaultMessage: 'Default',
        description: 'Default, the backup option if none other apply',
      }),
      size: 'small',
    },
    UNTIL_DO: {
      color: '#486991',
      title: intl.formatMessage({
        defaultMessage: 'Do',
        description: 'Do, as in "to do an action"',
      }),
      size: 'small',
    },
    SWITCH_ADD_CASE: {},
  };

  const handleTitleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.(title);
  };

  const data = SubgraphTypeData[subgraphType];

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
        <button
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
        </button>
      </div>
    );
  } else return null;
};
