import { ReactFlowNodeType } from '../../../constants/ReactFlowConstants';
import { customTokens } from '../../../core';
import { deleteCurrentlySelectedItem, setSelectedItem } from '../../../core/state/DataMapSlice';
import type { RootState } from '../../../core/state/Store';
import { collectSourceNodesForConnectionChain, collectTargetNodesForConnectionChain } from '../../../utils/Connection.Utils';
import { isNodeHighlighted } from '../../../utils/ReactFlow.Util';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
import HandleWrapper from './../HandleWrapper';
import { errorCardStyles, getStylesForSharedState, highlightedCardStyles, selectedCardStyles } from './../NodeCard';
import type { FunctionCardProps } from './FunctionCard';
import { inputsValid, shouldDisplaySourceHandle, shouldDisplayTargetHandle, useFunctionCardStyles } from './FunctionCard';
import { Button, mergeClasses, PresenceBadge, Text, tokens, Tooltip } from '@fluentui/react-components';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { CardContextMenu, MenuItemType, useCardContextMenu } from '@microsoft/designer-ui';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { NodeProps } from 'reactflow';
import { Position } from 'reactflow';

export const SimpleFunctionCard = (props: NodeProps<FunctionCardProps>) => {
  const { functionData, disabled, functionBranding, displayHandle, onClick, dataTestId } = props.data;
  const reactFlowId = props.id;

  const dispatch = useDispatch();
  const classes = useFunctionCardStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);
  const selectedItemKeyParts = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKeyParts);
  const sourceNodeConnectionBeingDrawnFromId = useSelector((state: RootState) => state.dataMap.sourceNodeConnectionBeingDrawnFromId);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);

  const connectedNodes = useMemo(
    () =>
      reactFlowId && connections[reactFlowId]
        ? [
            ...collectSourceNodesForConnectionChain(connections[reactFlowId], connections),
            ...collectTargetNodesForConnectionChain(connections[reactFlowId], connections),
          ]
        : [],
    // Only want to update when that specific connection updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reactFlowId, connections[reactFlowId]]
  );
  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);
  const isCurrentNodeHighlighted = useMemo<boolean>(() => {
    return isNodeHighlighted(isCurrentNodeSelected, selectedItemKeyParts, connectedNodes);
  }, [connectedNodes, isCurrentNodeSelected, selectedItemKeyParts]);

  const intl = useIntl();
  const contextMenu = useCardContextMenu();
  const getDeleteMenuItem = (): MenuItemOption => {
    const deleteDescription = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Delete text',
    });

    return {
      key: deleteDescription,
      disabled: false,
      iconName: 'Delete',
      title: deleteDescription,
      type: MenuItemType.Advanced,
      onClick: handleDeleteClick,
    };
  };

  const handleDeleteClick = () => {
    dispatch(setSelectedItem(reactFlowId));
    dispatch(deleteCurrentlySelectedItem());
  };

  const displayTargetHandle = shouldDisplayTargetHandle(displayHandle, sourceNodeConnectionBeingDrawnFromId, reactFlowId, functionData);
  const displaySourceHandle = shouldDisplaySourceHandle(
    displayHandle,
    sourceNodeConnectionBeingDrawnFromId,
    isCardHovered,
    isCurrentNodeSelected
  );

  const areCurrentInputsValid = useMemo(() => {
    return inputsValid(reactFlowId, functionData, connections);
  }, [connections, reactFlowId, functionData]);

  let cardStyle: React.CSSProperties = {
    backgroundColor: customTokens[functionBranding.colorTokenName],
  };

  if (isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId) {
    cardStyle = { ...selectedCardStyles, ...cardStyle };
  } else if (isCurrentNodeHighlighted) {
    cardStyle = { ...highlightedCardStyles, ...cardStyle };
  } else if (!areCurrentInputsValid) {
    cardStyle = { ...errorCardStyles, ...cardStyle };
  }

  return (
    <div
      onContextMenu={contextMenu.handle}
      className={mergeClasses(classes.container, 'nopan')}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      data-testid={dataTestId}
    >
      <HandleWrapper
        type="target"
        position={Position.Left}
        shouldDisplay={displayTargetHandle}
        nodeReactFlowType={ReactFlowNodeType.FunctionNode}
        nodeReactFlowId={reactFlowId}
      />

      {!areCurrentInputsValid && (
        <PresenceBadge
          size="extra-small"
          status="busy"
          style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            zIndex: 1,
          }}
        />
      )}

      <Tooltip
        content={{
          children: <Text size={200}>{functionData.displayName}</Text>,
        }}
        relationship="label"
      >
        <Button onClick={onClick} className={mergedClasses} style={cardStyle} disabled={!!disabled}>
          <FunctionIcon
            functionKey={functionData.key}
            functionName={functionData.functionName}
            categoryName={functionData.category}
            color={tokens.colorNeutralForegroundInverted}
          />
        </Button>
      </Tooltip>

      <HandleWrapper
        type="source"
        position={Position.Right}
        shouldDisplay={displaySourceHandle}
        nodeReactFlowType={ReactFlowNodeType.FunctionNode}
        nodeReactFlowId={reactFlowId}
      />
      <CardContextMenu
        title={'Delete'}
        contextMenuLocation={contextMenu.location}
        contextMenuOptions={[getDeleteMenuItem()]}
        showContextMenu={contextMenu.isShowing}
        onSetShowContextMenu={contextMenu.setIsShowing}
      />
    </div>
  );
};
