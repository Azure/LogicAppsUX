import type { FunctionGroupBranding } from '../../constants/FunctionConstants';
import { functionNodeCardSize } from '../../constants/NodeConstants';
import { ReactFlowNodeType } from '../../constants/ReactFlowConstants';
import { customTokens } from '../../core';
import type { RootState } from '../../core/state/Store';
import type { FunctionInput } from '../../models/Function';
import { getIconForFunction } from '../../utils/Icon.Utils';
import HandleWrapper from './HandleWrapper';
import { getStylesForSharedState, selectedCardStyles } from './NodeCard';
import type { CardProps } from './NodeCard';
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
  badge: {
    position: 'absolute',
    top: '1px',
    right: '-2px',
    zIndex: '1',
  },
  container: {
    height: `${sharedHalfCardSize}px`,
    width: `${sharedHalfCardSize}px`,
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
  functionName: string;
  maxNumberOfInputs: number;
  inputs: FunctionInput[];
  iconFileName?: string;
  functionBranding: FunctionGroupBranding;
}

export const FunctionCard = (props: NodeProps<FunctionCardProps>) => {
  const reactFlowId = props.id;
  const { functionName, maxNumberOfInputs, disabled, error, functionBranding, displayHandle, onClick } = props.data; // iconFileName
  const classes = useStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);
  const sourceNodeConnectionBeingDrawnFromId = useSelector((state: RootState) => state.dataMap.sourceNodeConnectionBeingDrawnFromId);

  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);

  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);
  const shouldDisplayHandles = isCardHovered || isCurrentNodeSelected;

  return (
    <div className={classes.container} onMouseEnter={() => setIsCardHovered(true)} onMouseLeave={() => setIsCardHovered(false)}>
      <HandleWrapper
        type="target"
        position={Position.Left}
        shouldDisplay={
          maxNumberOfInputs !== 0 &&
          displayHandle &&
          !!sourceNodeConnectionBeingDrawnFromId &&
          sourceNodeConnectionBeingDrawnFromId !== reactFlowId
        }
        nodeReactFlowType={ReactFlowNodeType.FunctionNode}
        nodeReactFlowId={reactFlowId}
      />

      {error && <PresenceBadge size="extra-small" status="busy" className={classes.badge} />}

      <Tooltip
        content={{
          children: <Text size={200}>{functionName}</Text>,
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
          {getIconForFunction(functionName, undefined, functionBranding) /* TODO: undefined -> iconFileName once all SVGs in */}
        </Button>
      </Tooltip>

      <HandleWrapper
        type="source"
        position={Position.Right}
        shouldDisplay={displayHandle && (sourceNodeConnectionBeingDrawnFromId === reactFlowId || shouldDisplayHandles)}
        nodeReactFlowType={ReactFlowNodeType.FunctionNode}
        nodeReactFlowId={reactFlowId}
      />
    </div>
  );
};
