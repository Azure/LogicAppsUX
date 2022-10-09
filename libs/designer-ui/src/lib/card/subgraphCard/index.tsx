import { ActionButtonV2 } from '../../actionbuttonv2';
import NodeCollapseToggle from '../../nodeCollapseToggle';
import { CardContextMenu } from '../cardcontextmenu';
import { useCardContextMenu, useCardKeyboardInteraction } from '../hooks';
import type { MenuItemOption } from '../types';
import { css } from '@fluentui/react';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { SUBGRAPH_TYPES } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

interface SubgraphCardProps {
  id: string;
  parentId: string;
  title: string;
  subgraphType: SubgraphType;
  collapsed?: boolean;
  handleCollapse?: (event: { currentTarget: any }) => void;
  selected?: boolean;
  readOnly?: boolean;
  onClick?(id?: string): void;
  showAddButton?: boolean;
  contextMenuOptions?: MenuItemOption[];
}

export const SubgraphCard: React.FC<SubgraphCardProps> = ({
  id,
  parentId,
  title,
  subgraphType,
  collapsed,
  handleCollapse,
  selected = false,
  readOnly = false,
  onClick,
  contextMenuOptions = [],
}) => {
  const intl = useIntl();

  const keyboardInteraction = useCardKeyboardInteraction(() => onClick?.(data.id), contextMenuOptions);
  const contextMenu = useCardContextMenu();

  if (subgraphType === SUBGRAPH_TYPES['SWITCH_ADD_CASE']) {
    if (readOnly) return null;
    return (
      <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
        <ActionButtonV2 title={'Add Case'} onClick={() => onClick?.()} />
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
      id: parentId,
    },
    CONDITIONAL_FALSE: {
      color: '#A4262C',
      title: intl.formatMessage({
        defaultMessage: 'False',
        description: 'False',
      }),
      size: 'small',
      id: parentId,
    },
    SWITCH_CASE: {
      color: '#484F58',
      title: title,
      size: 'large',
      id: id,
    },
    SWITCH_DEFAULT: {
      color: '#484F58',
      title: intl.formatMessage({
        defaultMessage: 'Default',
        description: 'Default, the backup option if none other apply',
      }),
      size: 'small',
      id: parentId,
    },
    UNTIL_DO: {
      color: '#486991',
      title: intl.formatMessage({
        defaultMessage: 'Do',
        description: 'Do, as in "to do an action"',
      }),
      size: 'small',
      id: id,
    },
    SWITCH_ADD_CASE: {},
  };

  const data = SubgraphTypeData[subgraphType];

  const handleTitleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.(data.id);
  };

  const colorVars = { ['--brand-color' as any]: SubgraphTypeData[subgraphType].color };

  if (data.size === 'large') {
    return (
      <div className={css('msla-subgraph-card', data.size)} style={colorVars} tabIndex={-1}>
        <div className={css('msla-selection-box', 'white-outline', selected && 'selected')} tabIndex={-1} />
        <button
          className="msla-subgraph-title"
          onClick={handleTitleClick}
          onContextMenu={contextMenu.handle}
          onKeyDown={keyboardInteraction.keyUp}
          onKeyUp={keyboardInteraction.keyDown}
        >
          {data.title}
        </button>
        <NodeCollapseToggle collapsed={collapsed} handleCollapse={handleCollapse} />
        {contextMenuOptions?.length > 0 ? (
          <CardContextMenu
            contextMenuLocation={contextMenu.location}
            contextMenuOptions={contextMenuOptions}
            showContextMenu={contextMenu.isShowing}
            title={data.title}
            onSetShowContextMenu={contextMenu.setIsShowing}
          />
        ) : null}
      </div>
    );
  } else if (data.size === 'small') {
    return (
      <div style={{ width: 200, display: 'grid', placeItems: 'center' }}>
        <div
          tabIndex={0}
          className={css('msla-subgraph-card', data.size)}
          style={colorVars}
          onClick={(e) => {
            handleTitleClick(e);
            handleCollapse?.(e);
          }}
          onKeyDown={keyboardInteraction.keyUp}
          onKeyUp={keyboardInteraction.keyDown}
        >
          <div className={css('msla-selection-box', 'white-outline', selected && 'selected')} tabIndex={-1} />
          <div className="msla-subgraph-title">{data.title}</div>
          <NodeCollapseToggle disabled collapsed={collapsed} />
        </div>
      </div>
    );
  } else return null;
};
