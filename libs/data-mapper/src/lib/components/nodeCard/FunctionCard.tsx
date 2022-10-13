import type { FunctionGroupBranding } from '../../constants/FunctionConstants';
import { customTokens } from '../../core';
import type { RootState } from '../../core/state/Store';
import type { FunctionInput } from '../../models/Function';
import { isValidFunctionNodeToTargetSchemaNodeConnection, isValidInputToFunctionNode } from '../../utils/Connection.Utils';
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
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { Connection as ReactFlowConnection, NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

const useStyles = makeStyles({
  root: {
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    color: tokens.colorNeutralForegroundInverted,
    fontSize: '20px',
    height: '32px',
    textAlign: 'center',
    width: '32px',
    minWidth: '32px',
    position: 'relative',
    justifyContent: 'center',
    ...shorthands.padding('0px'),
    ...shorthands.margin(tokens.strokeWidthThick),

    '&:disabled': {
      '&:hover': {
        color: tokens.colorNeutralForegroundInverted,
      },
    },

    '&:enabled': {
      '&:hover': {
        color: 'white',
      },
      '&:focus': {
        color: 'white',
      },
    },
  },

  badge: {
    position: 'absolute',
    top: '1px',
    right: '-2px',
    zIndex: '1',
  },

  container: {
    height: '32px',
    width: '32px',
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
  const { functionName, maxNumberOfInputs, inputs, disabled, error, functionBranding, iconFileName, displayHandle, onClick } = props.data;
  const classes = useStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  const functionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const isValidConnection = useCallback(
    (connection: ReactFlowConnection) => {
      if (connection.source && connection.target) {
        const sourceFunctionNode = functionDictionary[connection.source];
        // Target is either a function, or target schema, node
        const targetFunctionNode = functionDictionary[connection.target];
        const targetSchemaNode = flattenedTargetSchema[connection.target];
        const targetNodeConnection = connectionDictionary[connection.target];

        if (targetSchemaNode) {
          return isValidFunctionNodeToTargetSchemaNodeConnection(sourceFunctionNode.outputValueType, targetSchemaNode.normalizedDataType);
        }

        if (targetFunctionNode) {
          return isValidInputToFunctionNode(sourceFunctionNode.outputValueType, targetNodeConnection, maxNumberOfInputs, inputs);
        }

        return false;
      }

      return false;
    },
    [maxNumberOfInputs, inputs, functionDictionary, flattenedTargetSchema, connectionDictionary]
  );

  return (
    <div className={classes.container}>
      {displayHandle && maxNumberOfInputs !== 0 && (
        <Handle type="target" position={Position.Left} style={handleStyle} isValidConnection={() => false} />
      )}

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
          {getIconForFunction(functionName, iconFileName, functionBranding)}
        </Button>
      </Tooltip>

      {displayHandle && (
        <Handle
          type="source"
          position={Position.Right}
          style={handleStyle}
          isValidConnection={(connection) => isValidConnection(connection)}
        />
      )}
    </div>
  );
};
