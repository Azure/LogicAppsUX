import { setCanvasToolboxTabToDisplay, setInlineFunctionInputOutputKeys } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { getDestinationIdFromReactFlowConnectionId, getSourceIdFromReactFlowConnectionId } from '../../utils/ReactFlow.Util';
import { ToolboxPanelTabs } from '../canvasToolbox/CanvasToolbox';
import { Button, makeStyles, shorthands, tokens, Tooltip } from '@fluentui/react-components';
import { Add20Filled } from '@fluentui/react-icons';
import { getSmartEdge, pathfindingJumpPointNoDiagonal, svgDrawSmoothLinePath } from '@tisoap/react-flow-smart-edge';
import React, { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { BaseEdge, getSmoothStepPath, useNodes } from 'reactflow';
import type { EdgeProps } from 'reactflow';

const addFunctionBtnSize = 24;
const parentPadding = 4;
const parentTotalSize = addFunctionBtnSize + parentPadding * 2;

const getLineColor = (isSelected: boolean, isHovered: boolean) => {
  if (isSelected) {
    return tokens.colorCompoundBrandStroke;
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

  const inlineFunctionInputOutputKeys = useSelector((state: RootState) => state.dataMap.curDataMapOperation.inlineFunctionInputOutputKeys);

  const [isHovered, setIsHovered] = useState(false);

  const insertFnLoc = intl.formatMessage({
    defaultMessage: 'Insert function',
    description: 'Message to insert function',
  });

  const baseEdgeProperties = useMemo(
    () => ({
      sourcePosition,
      targetPosition,
      sourceX: sourceX + 10,
      sourceY,
      targetX: targetX - 10,
      targetY,
    }),
    [sourcePosition, targetPosition, sourceX, sourceY, targetX, targetY]
  );

  const smartEdge = useMemo(
    () =>
      getSmartEdge({
        ...baseEdgeProperties,
        nodes: reactFlowNodes,
        options: {
          // nodePadding
          // gridRatio
          // SmoothStep edge equivalent
          drawEdge: (source, target, path) => {
            // NOTE: Due to the use of a larger-scale and thus less accurate grid (10x10 pixels by default),
            // the Y value of the portions of the path that go straight into the nodes handles would not be
            // exactly on-level with the node-handle's Y value...so we just force that to be the case below
            const modifiedPath = [...path];

            const sourceY = source.y;
            const targetY = target.y;

            const pathStartLegY = path[0][1];
            const pathEndLegY = path[path.length - 1][1];

            modifiedPath.forEach((point, idx) => {
              if (point[1] === pathStartLegY) {
                modifiedPath[idx][1] = sourceY;
              } else if (point[1] === pathEndLegY) {
                modifiedPath[idx][1] = targetY;
              }
            });

            return svgDrawSmoothLinePath(source, target, modifiedPath);
          },
          generatePath: pathfindingJumpPointNoDiagonal,
        },
      }),
    [baseEdgeProperties, reactFlowNodes]
  );

  const { svgPathString, edgeCenterX, edgeCenterY } = useMemo(() => {
    if (smartEdge) {
      return smartEdge;
    } else {
      // getSmartEdge failed to find a valid path, so we'll just default to ReactFlow's built-in edge
      const [edgePath, labelX, labelY] = getSmoothStepPath({ ...baseEdgeProperties });
      return {
        svgPathString: edgePath,
        edgeCenterX: labelX,
        edgeCenterY: labelY,
      };
    }
  }, [smartEdge, baseEdgeProperties]);

  const isAddingInlineFunctionOnThisEdge = useMemo(() => {
    return (
      inlineFunctionInputOutputKeys.length === 2 &&
      inlineFunctionInputOutputKeys[0] === getSourceIdFromReactFlowConnectionId(id) &&
      inlineFunctionInputOutputKeys[1] === getDestinationIdFromReactFlowConnectionId(id)
    );
  }, [id, inlineFunctionInputOutputKeys]);

  const onAddFunctionClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    // Set the inline function input/output keys and show the Functions list toolbox to kick off the adding-functions-inline process
    dispatch(
      setInlineFunctionInputOutputKeys({
        inputKey: getSourceIdFromReactFlowConnectionId(id),
        outputKey: getDestinationIdFromReactFlowConnectionId(id),
      })
    );

    dispatch(setCanvasToolboxTabToDisplay(ToolboxPanelTabs.functionsList));
  };

  return (
    <svg onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <BaseEdge
        path={svgPathString}
        labelX={edgeCenterX}
        labelY={edgeCenterY}
        {...props}
        style={{
          strokeWidth: tokens.strokeWidthThick,
          stroke: getLineColor(!!selected, isHovered),
        }}
      />

      <foreignObject
        width={parentTotalSize}
        height={parentTotalSize}
        x={edgeCenterX - parentTotalSize / 2}
        y={edgeCenterY - parentTotalSize / 2}
        style={{
          borderRadius: tokens.borderRadiusCircular,
          padding: parentPadding,
        }}
      >
        {isAddingInlineFunctionOnThisEdge ? (
          <Button shape="circular" icon={<Add20Filled />} className={styles.addFnPlaceholder} style={btnStyles} disabled />
        ) : isHovered ? (
          <Tooltip relationship="label" content={insertFnLoc}>
            <Button
              shape="circular"
              icon={<Add20Filled style={{ height: 16, width: 16 }} />}
              onClick={onAddFunctionClick}
              className={styles.addFnBtn}
              style={btnStyles}
            />
          </Tooltip>
        ) : null}
      </foreignObject>
    </svg>
  );
};
