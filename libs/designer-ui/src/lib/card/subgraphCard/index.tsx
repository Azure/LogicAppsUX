import { ActionButtonV2 } from '../../actionbuttonv2';
import NodeCollapseToggle from '../../nodeCollapseToggle';
import { ErrorBanner } from '../errorbanner';
import { useCardKeyboardInteraction } from '../hooks';
import type { CardProps } from '..';
import type { MessageBarType } from '@fluentui/react';
import { css } from '@fluentui/react';
import type { SubgraphType } from '@microsoft/logic-apps-shared';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import type { MouseEventHandler } from 'react';
import { useMemo } from 'react';

interface SubgraphCardProps {
  id: string;
  parentId: string;
  title: string;
  subgraphType: SubgraphType;
  collapsed?: boolean;
  handleCollapse?: (includeNested?: boolean) => void;
  selectionMode?: CardProps['selectionMode'];
  readOnly?: boolean;
  onClick?(id?: string): void;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  onDeleteClick?(): void;
  showAddButton?: boolean;
  contextMenuItems?: JSX.Element[];
  errorLevel?: MessageBarType;
  errorMessage?: string;
  nodeIndex?: number;
  active?: boolean;
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
  onContextMenu,
  onDeleteClick,
  errorLevel,
  errorMessage,
  nodeIndex,
  active = true,
}) => {
  const intl = useIntl();

  const mainKeyboardInteraction = useCardKeyboardInteraction(() => onClick?.(data.id), onDeleteClick);
  const collapseKeyboardInteraction = useCardKeyboardInteraction(handleCollapse);

  const addCaseLabel = intl.formatMessage({
    defaultMessage: 'Add case',
    id: 'TcU2Gf',
    description: 'add a case to switch statement',
  });

  const addActionLabel = intl.formatMessage({
    defaultMessage: 'Add an action',
    id: 'PNzj7r',
    description: 'Add action to the loop, this adds a tool by default',
  });

  const conditionalTypeText = intl.formatMessage({
    defaultMessage: 'condition, collapse',
    id: 'YWD/RY',
    description: 'condition',
  });

  const SubgraphTypeData: Record<SubgraphType, any> = useMemo(
    () => ({
      CONDITIONAL_TRUE: {
        color: '#428000',
        title: intl.formatMessage({
          defaultMessage: 'True',
          id: '/WW7If',
          description: 'True',
        }),
        typeText: conditionalTypeText,
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
        typeText: conditionalTypeText,
        size: 'small',
        id: parentId,
      },
      SWITCH_CASE: {
        color: '#484F58',
        title: title,
        typeText: intl.formatMessage({
          defaultMessage: 'switch case',
          id: 'D0D3Sf',
          description: 'switch case',
        }),
        size: 'large',
        id: id,
      },
      AGENT_CONDITION: {
        color: '#07518e',
        title: title,
        typeText: intl.formatMessage({
          defaultMessage: 'agent condition',
          id: 'gOLL4k',
          description: 'agent condition',
        }),
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
        typeText: '',
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
        typeText: '',
        size: 'small',
        id: id,
      },
      SWITCH_ADD_CASE: {},
      AGENT_ADD_CONDITON: {},
    }),
    [conditionalTypeText, id, intl, parentId, title]
  );

  const data = useMemo(() => SubgraphTypeData[subgraphType], [SubgraphTypeData, subgraphType]);

  const cardAltText = useMemo(() => `${data.title} ${data.typeText}`, [data]);

  const handleTitleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.(data.id);
  };

  const colorVars = {
    ['--brand-color' as any]: SubgraphTypeData[subgraphType].color,
  };

  if (subgraphType === SUBGRAPH_TYPES['SWITCH_ADD_CASE'] || subgraphType === SUBGRAPH_TYPES['AGENT_ADD_CONDITON']) {
    if (readOnly) {
      return null;
    }
    const title = subgraphType === SUBGRAPH_TYPES['AGENT_ADD_CONDITON'] ? addActionLabel : addCaseLabel;
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <ActionButtonV2 title={title} onClick={() => onClick?.()} tabIndex={nodeIndex} />
      </div>
    );
  }

  if (data.size === 'large') {
    return (
      <div className={css('msla-subgraph-card', data.size, !active && 'msla-card-inactive')} style={colorVars} tabIndex={-1}>
        <div className={css('msla-selection-box', 'white-outline', selectionMode)} tabIndex={-1} />
        <button
          id={`msla-node-${id}`}
          className="msla-subgraph-title"
          aria-label={cardAltText}
          onClick={handleTitleClick}
          onContextMenu={onContextMenu}
          onKeyDown={mainKeyboardInteraction.keyDown}
          onKeyUp={mainKeyboardInteraction.keyUp}
          tabIndex={nodeIndex}
        >
          <div className="msla-subgraph-title-text">{data.title}</div>
          {errorMessage ? <ErrorBanner errorLevel={errorLevel} errorMessage={errorMessage} /> : null}
        </button>
        <NodeCollapseToggle id={id} collapsed={collapsed} handleCollapse={handleCollapse} tabIndex={nodeIndex} />
      </div>
    );
  }
  if (data.size === 'small') {
    return (
      <div className={css(!active && 'msla-card-inactive')} style={{ width: 200, display: 'grid', placeItems: 'center' }}>
        <div
          tabIndex={nodeIndex}
          role={'button'}
          aria-label={cardAltText}
          className={css('msla-subgraph-card', data.size)}
          style={colorVars}
          onClick={(e) => handleCollapse?.(e.shiftKey)}
          onContextMenu={onContextMenu}
          onKeyDown={collapseKeyboardInteraction.keyUp}
          onKeyUp={collapseKeyboardInteraction.keyDown}
          data-automation-id={`${id}-collapse-toggle-small`}
        >
          <div className={css('msla-selection-box', 'white-outline', selectionMode)} tabIndex={-1} />
          <div className="msla-subgraph-title msla-subgraph-title-text">{data.title}</div>
          <NodeCollapseToggle id={id} disabled collapsed={collapsed} onSmallCard />
        </div>
      </div>
    );
  }
  return null;
};
