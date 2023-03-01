import { ReactFlowNodeType } from '../../../constants/ReactFlowConstants';
import { customTokens } from '../../../core';
import { deleteCurrentlySelectedItem, setSelectedItem } from '../../../core/state/DataMapSlice';
import type { RootState } from '../../../core/state/Store';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
import HandleWrapper from './../HandleWrapper';
import { errorCardStyles, getStylesForSharedState, selectedCardStyles } from './../NodeCard';
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
  const sourceNodeConnectionBeingDrawnFromId = useSelector((state: RootState) => state.dataMap.sourceNodeConnectionBeingDrawnFromId);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);
  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);

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

  const cardStyle =
    isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId
      ? { ...selectedCardStyles, backgroundColor: customTokens[functionBranding.colorTokenName] }
      : areCurrentInputsValid
      ? { backgroundColor: customTokens[functionBranding.colorTokenName] }
      : { ...errorCardStyles, backgroundColor: customTokens[functionBranding.colorTokenName] };

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
