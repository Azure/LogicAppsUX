import type { FunctionGroupBranding } from '../../constants/FunctionConstants';
import { functionNodeCardSize } from '../../constants/NodeConstants';
import { ReactFlowNodeType } from '../../constants/ReactFlowConstants';
import { customTokens } from '../../core';
import type { RootState } from '../../core/state/Store';
import type { FunctionData } from '../../models/Function';
import { isCustomValue, isValidConnectionByType, isValidCustomValueByType } from '../../utils/Connection.Utils';
import { getIconForFunction } from '../../utils/Icon.Utils';
import { isSchemaNodeExtended } from '../../utils/Schema.Utils';
import HandleWrapper from './HandleWrapper';
import type { CardProps } from './NodeCard';
import { getStylesForSharedState, selectedCardStyles } from './NodeCard';
import {
  Button,
  createFocusOutlineStyle,
  makeStyles,
  mergeClasses,
  PresenceBadge,
  shorthands,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { NodeProps } from 'reactflow';
import { Position } from 'reactflow';

const sharedHalfCardSize = functionNodeCardSize / 2;

const useStyles = makeStyles({
  root: {
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    color: tokens.colorNeutralBackground1,
    fontSize: '20px',
    height: `${sharedHalfCardSize}px`,
    width: `${sharedHalfCardSize}px`,
    minWidth: `${sharedHalfCardSize}px`,
    textAlign: 'center',
    position: 'relative',
    justifyContent: 'center',
    ...shorthands.padding('0px'),
    ...shorthands.margin(tokens.strokeWidthThick),
    '&:hover': {
      color: tokens.colorNeutralBackground1,
    },
    '&:active': {
      // Not sure what was overwriting the base color, but the important overwrites the overwrite
      color: `${tokens.colorNeutralBackground1} !important`,
    },
  },
  errorBadge: {
    position: 'absolute',
    top: '1px',
    right: '-2px',
    zIndex: '1',
  },
  container: {
    position: 'relative',
  },
  focusIndicator: createFocusOutlineStyle({
    selector: 'focus-within',
    style: {
      outlineRadius: '100px',
    },
  }),
});

export interface FunctionCardProps extends CardProps {
  functionData: FunctionData;
  functionBranding: FunctionGroupBranding;
  dataTestId: string;
}

export const FunctionCard = (props: NodeProps<FunctionCardProps>) => {
  const reactFlowId = props.id;
  const { functionData, disabled, functionBranding, displayHandle, onClick, dataTestId } = props.data;
  const classes = useStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);
  const sourceNodeConnectionBeingDrawnFromId = useSelector((state: RootState) => state.dataMap.sourceNodeConnectionBeingDrawnFromId);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);

  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);

  const shouldDisplayHandles = !sourceNodeConnectionBeingDrawnFromId && (isCardHovered || isCurrentNodeSelected);
  const shouldDisplayTargetHandle =
    displayHandle &&
    functionData.maxNumberOfInputs !== 0 &&
    !!sourceNodeConnectionBeingDrawnFromId &&
    sourceNodeConnectionBeingDrawnFromId !== reactFlowId;
  const shouldDisplaySourceHandle = displayHandle && shouldDisplayHandles;

  const areCurrentInputsValid = useMemo(() => {
    let isEveryInputValid = true;
    const curConn = connections[reactFlowId];

    if (curConn) {
      Object.values(curConn.inputs).forEach((inputArr, inputIdx) => {
        inputArr.forEach((inputVal) => {
          let inputValMatchedOneOfAllowedTypes = false;

          functionData.inputs[inputIdx].allowedTypes.forEach((allowedInputType) => {
            if (inputVal !== undefined) {
              if (isCustomValue(inputVal)) {
                if (isValidCustomValueByType(inputVal, allowedInputType)) {
                  inputValMatchedOneOfAllowedTypes = true;
                }
              } else {
                if (isSchemaNodeExtended(inputVal.node)) {
                  if (isValidConnectionByType(allowedInputType, inputVal.node.normalizedDataType)) {
                    inputValMatchedOneOfAllowedTypes = true;
                  }
                } else if (isValidConnectionByType(allowedInputType, inputVal.node.outputValueType)) {
                  inputValMatchedOneOfAllowedTypes = true;
                }
              }
            }
          });

          if (!inputValMatchedOneOfAllowedTypes) {
            isEveryInputValid = false;
          }
        });
      });
    }

    return isEveryInputValid;
  }, [connections, reactFlowId, functionData.inputs]);

  return (
    <div
      className={mergeClasses(classes.container, 'nopan')}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      data-testid={dataTestId}
    >
      <HandleWrapper
        type="target"
        position={Position.Left}
        shouldDisplay={shouldDisplayTargetHandle}
        nodeReactFlowType={ReactFlowNodeType.FunctionNode}
        nodeReactFlowId={reactFlowId}
      />

      {!areCurrentInputsValid && <PresenceBadge size="extra-small" status="busy" className={classes.errorBadge} />}

      <Tooltip
        content={{
          children: <Text size={200}>{functionData.displayName}</Text>,
        }}
        relationship="label"
      >
        <Button
          onClick={onClick}
          className={mergedClasses}
          style={
            isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId
              ? { ...selectedCardStyles, backgroundColor: customTokens[functionBranding.colorTokenName] }
              : { backgroundColor: customTokens[functionBranding.colorTokenName] }
          }
          disabled={!!disabled}
        >
          {getIconForFunction(functionData.functionName, functionData.category, functionData.iconFileName, functionBranding)}
        </Button>
      </Tooltip>

      <HandleWrapper
        type="source"
        position={Position.Right}
        shouldDisplay={shouldDisplaySourceHandle}
        nodeReactFlowType={ReactFlowNodeType.FunctionNode}
        nodeReactFlowId={reactFlowId}
      />
    </div>
  );
};
