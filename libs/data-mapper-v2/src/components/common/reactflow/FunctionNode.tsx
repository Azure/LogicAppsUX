import type { FunctionGroupBranding } from '../../../constants/FunctionConstants';
import { ReactFlowNodeType } from '../../../constants/ReactFlowConstants';
import { customTokens } from '../../../core';
import type { RootState } from '../../../core/state/Store';
import type { FunctionData } from '../../../models';
//import { isNodeHighlighted } from '../../../utils/ReactFlow.Util';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
//import HandleWrapper from './../HandleWrapper';
//import { errorCardStyles, getStylesForSharedState, highlightedCardStyles, selectedCardStyles } from './../NodeCard';
//import { inputsValid, shouldDisplaySourceHandle, shouldDisplayTargetHandle, useFunctionCardStyles } from './FunctionCard';
import { Button, PresenceBadge, Text, Tooltip, tokens } from '@fluentui/react-components';
import { useCardContextMenu } from '@microsoft/designer-ui';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { NodeProps } from 'reactflow';
import { Position } from 'reactflow';

export interface FunctionCardProps extends CardProps {
    functionData: FunctionData;
    functionBranding: FunctionGroupBranding;
    dataTestId: string;
  }  

  export interface CardProps {
    onClick?: () => void;
    displayHandle: boolean;
    disabled: boolean;
  }

export const FunctionNode = (props: NodeProps<FunctionCardProps>) => {
  const { functionData, disabled, functionBranding, displayHandle, onClick, dataTestId } = props.data;
  const reactFlowId = props.id;

  //const classes = useFunctionCardStyles();
  //const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);
  const selectedItemConnectedNodes = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes
  );
  const sourceNodeConnectionBeingDrawnFromId = useSelector(
    (state: RootState) => state.dataMap.present.sourceNodeConnectionBeingDrawnFromId
  );
  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);

  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);
//   const isCurrentNodeHighlighted = useMemo<boolean>(() => {
//     return isNodeHighlighted(isCurrentNodeSelected, reactFlowId, selectedItemConnectedNodes);
//   }, [isCurrentNodeSelected, reactFlowId, selectedItemConnectedNodes]);

  const contextMenu = useCardContextMenu();

//   const displayTargetHandle = shouldDisplayTargetHandle(displayHandle, sourceNodeConnectionBeingDrawnFromId, reactFlowId, functionData);
//   const displaySourceHandle = shouldDisplaySourceHandle(
//     displayHandle,
//     sourceNodeConnectionBeingDrawnFromId,
//     isCardHovered,
//     isCurrentNodeSelected
//   );

//   const areCurrentInputsValid = useMemo(() => {
//     return inputsValid(reactFlowId, functionData, connections);
//   }, [connections, reactFlowId, functionData]);

  let cardStyle: React.CSSProperties = {
    backgroundColor: customTokens[functionBranding.colorTokenName],
  };

//   if (isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId) {
//     cardStyle = { ...selectedCardStyles, ...cardStyle };
//   } else if (isCurrentNodeHighlighted) {
//     cardStyle = { ...highlightedCardStyles, ...cardStyle };
//   } else if (!areCurrentInputsValid) {
//     cardStyle = { ...errorCardStyles, ...cardStyle };
//   }

  return (
    <div
      onContextMenu={contextMenu.handle}
      //className={mergeClasses(classes.container, 'nopan')}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      data-testid={dataTestId}
    >
      {/* <HandleWrapper
        type="target"
        position={Position.Left}
        shouldDisplay={true}
        nodeReactFlowType={ReactFlowNodeType.FunctionNode}
        nodeReactFlowId={reactFlowId}
      /> */}
      <Tooltip
        content={{
          children: <Text size={200}>{functionData.displayName}</Text>,
        }}
        relationship="label"
      >
        <Button onClick={onClick} style={cardStyle} disabled={!!disabled}>
          <FunctionIcon
          iconSize={11}
            functionKey={functionData.key}
            functionName={functionData.functionName}
            categoryName={functionData.category}
            color={tokens.colorNeutralForegroundInverted}
          />
        </Button>
      </Tooltip>

      {/* <HandleWrapper
        type="source"
        position={Position.Right}
        shouldDisplay={true}
        nodeReactFlowType={ReactFlowNodeType.FunctionNode}
        nodeReactFlowId={reactFlowId}
      /> */}
    </div>
  );
};
