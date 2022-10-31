import type { FunctionGroupBranding } from '../../constants/FunctionConstants';
import { functionNodeCardSize } from '../../constants/NodeConstants';
import { customTokens } from '../../core';
import type { RootState } from '../../core/state/Store';
import type { FunctionInput } from '../../models/Function';
import {
  isValidFunctionNodeToSchemaNodeConnection,
  isValidInputToFunctionNode,
  newConnectionWillHaveCircularLogic,
} from '../../utils/Connection.Utils';
import { getIconForFunction } from '../../utils/Icon.Utils';
import type { CardProps } from './NodeCard';
import { getStylesForSharedState } from './NodeCard';
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
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import type { Connection as ReactFlowConnection, NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

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

const handleStyle: React.CSSProperties = { zIndex: 5, width: '10px', height: '10px' };

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
  const functionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);

  const isValidConnection = useCallback(
    (connection: ReactFlowConnection) => {
      if (connection.source && connection.target) {
        const sourceFunctionNode = functionDictionary[connection.source];
        // Target is either a function, or target schema, node
        const targetFunctionNode = functionDictionary[connection.target];
        const targetSchemaNode = flattenedTargetSchema[connection.target];
        const targetNodeConnection = connectionDictionary[connection.target];

        if (targetSchemaNode) {
          return isValidFunctionNodeToSchemaNodeConnection(sourceFunctionNode.outputValueType, targetSchemaNode.normalizedDataType);
        }

        if (targetFunctionNode) {
          // Verify the connection (Function<->Function) won't create circular logic
          if (newConnectionWillHaveCircularLogic(connection.target, connection.source, connectionDictionary)) {
            return false;
          } else {
            return isValidInputToFunctionNode(
              sourceFunctionNode.outputValueType,
              targetNodeConnection,
              targetFunctionNode.maxNumberOfInputs,
              targetFunctionNode.inputs
            );
          }
        }

        return false;
      }

      return false;
    },
    [functionDictionary, flattenedTargetSchema, connectionDictionary]
  );

  const shouldDisplayHandles = isCardHovered || selectedItemKey === reactFlowId;

  return (
    <div className={classes.container} onMouseEnter={() => setIsCardHovered(true)} onMouseLeave={() => setIsCardHovered(false)}>
      <Handle
        type="target"
        position={Position.Left}
        style={{
          ...handleStyle,
          visibility:
            displayHandle &&
            !!sourceNodeConnectionBeingDrawnFromId &&
            sourceNodeConnectionBeingDrawnFromId !== reactFlowId &&
            maxNumberOfInputs !== 0
              ? 'visible'
              : 'hidden',
        }}
        isValidConnection={() => false}
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
          style={{ backgroundColor: customTokens[functionBranding.colorTokenName] }}
          disabled={!!disabled}
        >
          {getIconForFunction(functionName, undefined, functionBranding) /* TODO: undefined -> iconFileName once all SVGs in */}
        </Button>
      </Tooltip>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          ...handleStyle,
          visibility:
            displayHandle && (sourceNodeConnectionBeingDrawnFromId === reactFlowId || shouldDisplayHandles) ? 'visible' : 'hidden',
        }}
        isValidConnection={(connection) => isValidConnection(connection)}
      />
    </div>
  );
};
