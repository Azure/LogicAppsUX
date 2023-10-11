import {
  deleteCurrentlySelectedItem,
  setCanvasToolboxTabToDisplay,
  setInlineFunctionInputOutputKeys,
  setSelectedItem,
} from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { getSmoothStepEdge } from '../../utils/Edge.Utils';
import {
  getDestinationIdFromReactFlowConnectionId,
  getPortFromReactFlowConnectionId,
  getSourceIdFromReactFlowConnectionId,
  getSplitIdsFromReactFlowConnectionId,
  isEdgeHighlighted,
} from '../../utils/ReactFlow.Util';
import { ToolboxPanelTabs } from '../canvasToolbox/CanvasToolbox';
import { Button, Tooltip, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { Add20Filled } from '@fluentui/react-icons';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { CardContextMenu, MenuItemType, useCardContextMenu } from '@microsoft/designer-ui';
import React, { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { EdgeProps } from 'reactflow';
import { BaseEdge, useNodes } from 'reactflow';

const addFunctionBtnSize = 24;
const parentPadding = 4;
const parentTotalSize = addFunctionBtnSize + parentPadding * 2;

const getLineColor = (isSelected: boolean, isHighlighted: boolean, isHovered: boolean) => {
  if (isSelected) {
    return tokens.colorCompoundBrandStroke;
  }
  if (isHighlighted) {
    return tokens.colorBrandStroke2;
  } else {
    return isHovered ? tokens.colorNeutralStroke1Hover : tokens.colorNeutralStroke1;
  }
};

const btnStyles = {
  height: addFunctionBtnSize,
  minHeight: addFunctionBtnSize,
  maxHeight: addFunctionBtnSize,
  width: addFunctionBtnSize,
  minWidth: addFunctionBtnSize,
  maxWidth: addFunctionBtnSize,
  padding: 0,
};

const btnIconStyles = {
  height: 16,
  width: 16,
};

const useStyles = makeStyles({
  addFnBtn: {
    color: tokens.colorCompoundBrandForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,

    ':hover': {
      color: tokens.colorCompoundBrandForeground1Hover,
      backgroundColor: tokens.colorNeutralBackground1Hover,
      boxShadow: tokens.shadow4,
    },
  },
  addFnPlaceholder: {
    color: tokens.colorCompoundBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('1px', 'dashed', tokens.colorCompoundBrandStroke),
  },
});

export const ConnectionEdge = (props: EdgeProps) => {
  const { id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, selected } = props;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();
  const reactFlowNodes = useNodes();

  const [sourceReactFlowKey, destinationRectFlowKey, _destinationPortReactFlowKey] = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.inlineFunctionInputOutputKeys
  );
  const selectedItemKeyParts = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKeyParts);
  const selectedItemConnectedNodes = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes
  );

  const [isHovered, setIsHovered] = useState(false);

  const insertFnLoc = intl.formatMessage({
    defaultMessage: 'Insert function',
    description: 'Message to insert function',
  });

  const { svgPath, labelX, labelY } = useMemo(() => {
    const [edgePath, labelX, labelY] = getSmoothStepEdge({
      nodes: reactFlowNodes,
      sourcePosition,
      targetPosition,
      sourceX,
      sourceY,
      targetX,
      targetY,
      pfGridSize: 10,
      nodePadding: 15,
      edgeBendOffsetRatio: 5,
      borderRadius: 8,
    });

    return {
      svgPath: edgePath,
      labelX,
      labelY,
    };
  }, [reactFlowNodes, sourcePosition, targetPosition, sourceX, sourceY, targetX, targetY]);

  const currentItemSplitIds = useMemo(() => getSplitIdsFromReactFlowConnectionId(id), [id]);

  const isAddingInlineFunctionOnThisEdge = useMemo(() => {
    return (
      selectedItemKeyParts &&
      selectedItemKeyParts.destinationId &&
      sourceReactFlowKey &&
      sourceReactFlowKey === selectedItemKeyParts.sourceId &&
      destinationRectFlowKey &&
      destinationRectFlowKey === selectedItemKeyParts.destinationId
    );
  }, [destinationRectFlowKey, selectedItemKeyParts, sourceReactFlowKey]);

  const isCurrentNodeHighlighted = useMemo<boolean>(() => {
    return isEdgeHighlighted(!!selected, currentItemSplitIds, selectedItemConnectedNodes);
  }, [currentItemSplitIds, selected, selectedItemConnectedNodes]);

  const x = Math.round(labelX - parentTotalSize / 2);
  const y = labelY - parentTotalSize / 2;

  const onAddFunctionClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    // Set the inline function input/output keys and show the Functions list toolbox to kick off the adding-functions-inline process
    dispatch(
      setInlineFunctionInputOutputKeys({
        inputKey: getSourceIdFromReactFlowConnectionId(id),
        outputKey: getDestinationIdFromReactFlowConnectionId(id),
        port: getPortFromReactFlowConnectionId(id),
        x: x.toString(),
        y: y.toString(),
      })
    );

    dispatch(setCanvasToolboxTabToDisplay(ToolboxPanelTabs.functionsList));
  };

  const contextMenu = useCardContextMenu();
  const getRemoveMenuItem = (): MenuItemOption => {
    const deleteLine = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Remove line from canvas',
    });

    return {
      key: deleteLine,
      disabled: false,
      iconName: 'Delete',
      title: deleteLine,
      type: MenuItemType.Advanced,
      onClick: handleDeleteClick,
    };
  };

  const handleDeleteClick = () => {
    dispatch(setSelectedItem(id));
    dispatch(deleteCurrentlySelectedItem());
  };

  return (
    <svg onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onContextMenu={contextMenu.handle}>
      <BaseEdge
        path={svgPath}
        labelX={labelX}
        labelY={labelY}
        {...props}
        style={{
          strokeWidth: tokens.strokeWidthThick,
          stroke: getLineColor(!!selected, isCurrentNodeHighlighted, isHovered),
        }}
        interactionWidth={10}
      />

      <foreignObject
        width={parentTotalSize}
        height={parentTotalSize}
        x={x}
        y={y}
        style={{
          borderRadius: tokens.borderRadiusCircular,
          padding: parentPadding,
        }}
      >
        {isAddingInlineFunctionOnThisEdge ? (
          <Button
            shape="circular"
            icon={<Add20Filled style={btnIconStyles} />}
            className={styles.addFnPlaceholder}
            style={btnStyles}
            disabled
          />
        ) : isHovered ? (
          <Tooltip relationship="label" content={insertFnLoc}>
            <Button
              shape="circular"
              icon={<Add20Filled style={btnIconStyles} />}
              onClick={onAddFunctionClick}
              className={styles.addFnBtn}
              style={btnStyles}
            />
          </Tooltip>
        ) : null}
      </foreignObject>
      <CardContextMenu
        title={'Delete'}
        contextMenuLocation={contextMenu.location}
        contextMenuOptions={[getRemoveMenuItem()]}
        showContextMenu={contextMenu.isShowing}
        onSetShowContextMenu={contextMenu.setIsShowing}
      />
    </svg>
  );
};
