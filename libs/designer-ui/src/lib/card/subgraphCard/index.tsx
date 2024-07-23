import { ActionButtonV2 } from '../../actionbuttonv2';
import NodeCollapseToggle from '../../nodeCollapseToggle';
import { CardContextMenu } from '../cardcontextmenu';
import { ErrorBanner } from '../errorbanner';
import { useCardContextMenu, useCardKeyboardInteraction } from '../hooks';
import type { CardProps } from '..';
import type { MessageBarType } from '@fluentui/react';
import { css } from '@fluentui/react';
import type { SubgraphType } from '@microsoft/logic-apps-shared';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

interface SubgraphCardProps {
  id: string;
  parentId: string;
  title: string;
  subgraphType: SubgraphType;
  collapsed?: boolean;
  handleCollapse?: () => void;
  selectionMode?: CardProps['selectionMode'];
  readOnly?: boolean;
  onClick?(id?: string): void;
  onDeleteClick?(): void;
  showAddButton?: boolean;
  contextMenuItems?: JSX.Element[];
  errorLevel?: MessageBarType;
  errorMessage?: string;
}

export const SubgraphCard: React.FC<SubgraphCardProps> = ({
  id,
  parentId,
  title,
  subgraphType,
  collapsed,
  handleCollapse,
  selectionMode = false,
  readOnly = false,
  onClick,
  onDeleteClick,
  contextMenuItems = [],
  errorLevel,
  errorMessage,
}) => {
  const intl = useIntl();

  const mainKeyboardInteraction = useCardKeyboardInteraction(() => onClick?.(data.id), onDeleteClick);
  const collapseKeyboardInteraction = useCardKeyboardInteraction(handleCollapse);
  const contextMenu = useCardContextMenu();

  const addCaseLabel = intl.formatMessage({
    defaultMessage: 'Add Case',
    id: 'sQ2vRs',
    description: 'add a case to switch statement',
  });

  if (subgraphType === SUBGRAPH_TYPES['SWITCH_ADD_CASE']) {
    if (readOnly) {
      return null;
    }
    return (
      <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
        <ActionButtonV2 title={addCaseLabel} onClick={() => onClick?.()} />
      </div>
    );
  }

  const SubgraphTypeData: Record<SubgraphType, any> = {
    CONDITIONAL_TRUE: {
      color: '#428000',
      title: intl.formatMessage({
        defaultMessage: 'True',
        id: '/WW7If',
        description: 'True',
      }),
      size: 'small',
      id: parentId,
    },
    CONDITIONAL_FALSE: {
      color: '#A4262C',
      title: intl.formatMessage({
        defaultMessage: 'False',
        id: 'PXa0D4',
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
        id: 'FUuFlC',
        description: 'Default, the backup option if none other apply',
      }),
      size: 'small',
      id: parentId,
    },
    UNTIL_DO: {
      color: '#486991',
      title: intl.formatMessage({
        defaultMessage: 'Do',
        id: 'c/+j08',
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
        <div className={css('msla-selection-box', 'white-outline', selectionMode)} tabIndex={-1} />
        <button
          id={`msla-node-${id}`}
          className="msla-subgraph-title"
          onClick={handleTitleClick}
          onContextMenu={contextMenu.handle}
          onKeyDown={mainKeyboardInteraction.keyDown}
          onKeyUp={mainKeyboardInteraction.keyUp}
        >
          <div className="msla-subgraph-title-text">{data.title}</div>
          {errorMessage ? <ErrorBanner errorLevel={errorLevel} errorMessage={errorMessage} /> : null}
        </button>
        <NodeCollapseToggle collapsed={collapsed} handleCollapse={handleCollapse} />
        {contextMenuItems?.length > 0 ? (
          <CardContextMenu
            contextMenuLocation={contextMenu.location}
            menuItems={contextMenuItems}
            open={contextMenu.isShowing}
            title={data.title}
            setOpen={contextMenu.setIsShowing}
          />
        ) : null}
      </div>
    );
  }
  if (data.size === 'small') {
    return (
      <div style={{ width: 200, display: 'grid', placeItems: 'center' }}>
        <div
          tabIndex={0}
          className={css('msla-subgraph-card', data.size)}
          style={colorVars}
          onClick={handleCollapse}
          onKeyDown={collapseKeyboardInteraction.keyUp}
          onKeyUp={collapseKeyboardInteraction.keyDown}
        >
          <div className={css('msla-selection-box', 'white-outline', selectionMode)} tabIndex={-1} />
          <div className="msla-subgraph-title msla-subgraph-title-text">{data.title}</div>
          <NodeCollapseToggle disabled collapsed={collapsed} onSmallCard />
        </div>
      </div>
    );
  }
  return null;
};
