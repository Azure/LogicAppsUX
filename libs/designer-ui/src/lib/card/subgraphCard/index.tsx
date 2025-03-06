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
    id: '4dc53619f2bd',
    description: 'add a case to switch statement',
  });

  const conditionalTypeText = intl.formatMessage({
    defaultMessage: 'condition, collapse',
    id: '6160ff4588b0',
    description: 'condition',
  });

  const SubgraphTypeData: Record<SubgraphType, any> = useMemo(
    () => ({
      CONDITIONAL_TRUE: {
        color: '#428000',
        title: intl.formatMessage({
          defaultMessage: 'True',
          id: 'fd65bb21f3c8',
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
          id: '3d76b40f8ff8',
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
          id: '0f40f749f675',
          description: 'switch case',
        }),
        size: 'large',
        id: id,
      },
      SWITCH_DEFAULT: {
        color: '#484F58',
        title: intl.formatMessage({
          defaultMessage: 'Default',
          id: '154b859428a1',
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
          id: '73ffa3d3ce94',
          description: 'Do, as in "to do an action"',
        }),
        typeText: '',
        size: 'small',
        id: id,
      },
      SWITCH_ADD_CASE: {},
    }),
    [conditionalTypeText, id, intl, parentId, title]
  );

  const data = useMemo(() => SubgraphTypeData[subgraphType], [SubgraphTypeData, subgraphType]);

  const cardAltText = useMemo(() => `${data.title} ${data.typeText}`, [data]);

  const handleTitleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.(data.id);
  };

  const colorVars = { ['--brand-color' as any]: SubgraphTypeData[subgraphType].color };

  if (subgraphType === SUBGRAPH_TYPES['SWITCH_ADD_CASE']) {
    if (readOnly) {
      return null;
    }
    return (
      <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
        <ActionButtonV2 title={addCaseLabel} onClick={() => onClick?.()} tabIndex={nodeIndex} />
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
