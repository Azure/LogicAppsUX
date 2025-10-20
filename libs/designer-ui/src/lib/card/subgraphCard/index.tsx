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
import {  useMemo, useRef } from 'react';

interface SubgraphCardProps {
  id: string;
  parentId: string;
  title: string;
  subgraphType: SubgraphType;
  collapsed?: boolean;
  handleCollapse?: (includeNested?: boolean) => void;
  selectionMode?: CardProps['selectionMode'];
  readOnly?: boolean;
  onClick?(id?: string, rect?: DOMRect): void;
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

  const buttonRef = useRef<HTMLDivElement>(null);

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
        color: '#3352B9',
        title: title,
        typeText: intl.formatMessage({
          defaultMessage: 'agent condition',
          id: 'gOLL4k',
          description: 'agent condition',
        }),
        size: 'large',
        id: id,
        iconUri:
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUiIGhlaWdodD0iMTUiIHZpZXdCb3g9IjAgMCAxNSAxNSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTguMjEwOCA0LjMxMTg1QzguMjEwOCAyLjE2MDI0IDYuNDY2NTIgMC40MTYwMTYgNC4zMTQ5NiAwLjQxNjAxNkMzLjc3MTgxIDAuNDE2MDE2IDMuMjUzMzEgMC41Mjc0NzIgMi43ODIyIDAuNzI5MjYyQzIuNjIwMTMgMC43OTg2NzkgMi41MDMwNCAwLjk0Mzk2NSAyLjQ2OTY4IDEuMTE3MDhDMi40MzYzMiAxLjI5MDIgMi40OTEwNyAxLjQ2ODU5IDIuNjE1NzQgMS41OTMyNUw0LjQ0ODkxIDMuNDI2NDNMMy40MjkzMyA0LjQ0NTk3TDEuNTk2MjQgMi42MTI4NUMxLjQ3MTU3IDIuNDg4MTkgMS4yOTMxNCAyLjQzMzQ5IDEuMTIwMDIgMi40NjY4NUMwLjk0NjkwNyAyLjUwMDIyIDAuODAxNjI4IDIuNjE3MzEgMC43MzIyMTEgMi43NzkzOEMwLjUzMDU0OSAzLjI1MDQzIDAuNDE5MTI4IDMuNzY4ODIgMC40MTkxMjggNC4zMTE4NUMwLjQxOTEyOCA2LjQ2MzQ4IDIuMTYzMzMgOC4yMDc2OCA0LjMxNDk2IDguMjA3NjhDNC42MjgxOSA4LjIwNzY4IDQuOTMzMzQgOC4xNzA2NCA1LjIyNjAyIDguMTAwNDRMMTEuMTEzOSAxMy45ODgzQzExLjkwODIgMTQuNzgyNiAxMy4xOTYgMTQuNzgyNiAxMy45OTAyIDEzLjk4ODNDMTQuNzg0NSAxMy4xOTQxIDE0Ljc4NDUgMTEuOTA2MyAxMy45OTAyIDExLjExMjFMOC4xMDMwNiA1LjIyNDg4QzguMTczNTQgNC45MzE2MSA4LjIxMDggNC42MjU4IDguMjEwOCA0LjMxMTg1Wk00LjMxNDk2IDEuNDc4NTJDNS44Nzk3NCAxLjQ3ODUyIDcuMTQ4MyAyLjc0NzA0IDcuMTQ4MyA0LjMxMTg1QzcuMTQ4MyA0LjYyNzEgNy4wOTcwMSA0LjkyOTMgNy4wMDI3MyA1LjIxMTE4QzYuOTM4ODQgNS40MDIxOSA2Ljk4ODUgNS42MTI5IDcuMTMwODcgNS43NTUzMUwxMy4yMzg5IDExLjg2MzNDMTMuNjE4MyAxMi4yNDI3IDEzLjYxODMgMTIuODU3NyAxMy4yMzg5IDEzLjIzNzFDMTIuODU5NiAxMy42MTY0IDEyLjI0NDYgMTMuNjE2NCAxMS44NjUyIDEzLjIzNzFMNS43NTY1NiA3LjEyODRDNS42MTQyNiA2Ljk4NjA5IDUuNDAzNjcgNi45MzY0NCA1LjIxMjc3IDcuMDAwMTJDNC45MzEyOCA3LjA5NDExIDQuNjI5NiA3LjE0NTE4IDQuMzE0OTYgNy4xNDUxOEMyLjc1MDExIDcuMTQ1MTggMS40ODE2MyA1Ljg3NjY2IDEuNDgxNjMgNC4zMTE4NUMxLjQ4MTYzIDQuMjExODcgMS40ODY4IDQuMTEzMiAxLjQ5Njg2IDQuMDE2MDRMMi44MDMyNCA1LjMyMjQ4QzMuMTQ5MDUgNS42NjgyNiAzLjcwOTY5IDUuNjY4MjYgNC4wNTU0MyA1LjMyMjQ4TDUuMzI1NCA0LjA1MjUxQzUuNjcxMjEgMy43MDY3NCA1LjY3MTIxIDMuMTQ2MTIgNS4zMjU0IDIuODAwMzVMNC4wMTg4MSAxLjQ5Mzc3QzQuMTE2MDYgMS40ODM2OSA0LjIxNDg3IDEuNDc4NTIgNC4zMTQ5NiAxLjQ3ODUyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
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
      MCP_CLIENT: {},
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
        ref={buttonRef}
        style={{
          display: 'grid',
          placeItems: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <ActionButtonV2 title={title} onClick={(e) => onClick?.(undefined, buttonRef.current?.getBoundingClientRect())} tabIndex={nodeIndex} />
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
          <div className="msla-subgraph-title-container">
            {data.iconUri ? <img className="msla-subgraph-title-icon" src={data.iconUri} alt="" /> : null}
            <div className="msla-subgraph-title-text">
              <span>{data.title}</span>
            </div>
          </div>
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
