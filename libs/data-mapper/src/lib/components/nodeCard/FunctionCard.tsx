import type { FunctionGroupBranding } from '../../constants/FunctionConstants';
import { customTokens } from '../../core';
import type { RootState } from '../../core/state/Store';
import { NormalizedDataType } from '../../models';
import type { Connection } from '../../models/Connection';
import type { FunctionInput } from '../../models/Function';
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

export interface FunctionCardProps extends CardProps {
  functionName: string;
  maxNumberOfInputs: number;
  inputs: FunctionInput[];
  iconFileName?: string;
  functionBranding: FunctionGroupBranding;
}

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

export const FunctionCard = (props: NodeProps<FunctionCardProps>) => {
  const { functionName, maxNumberOfInputs, inputs, disabled, error, functionBranding, iconFileName, displayHandle, onClick } = props.data;
  const classes = useStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  const flattenedSourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const functionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const isTypeSupported = useCallback(
    (inputNodeType: NormalizedDataType) => {
      return inputs.some((input) =>
        input.allowedTypes.some((allowedType) => allowedType === NormalizedDataType.Any || allowedType === inputNodeType)
      );
    },
    [inputs]
  );

  const isTypeSupportedAndAvailable = useCallback(
    (curCon: Connection | undefined, inputNodeType: NormalizedDataType) => {
      if (curCon) {
        if (curCon.inputs.length === 0 && isTypeSupported(inputNodeType)) {
          return true;
        }

        let supportedTypeInputIsAvailable = false;
        curCon.inputs.forEach((input, idx) => {
          if (!input) {
            if (inputs[idx].allowedTypes.some((allowedType) => allowedType === inputNodeType)) {
              supportedTypeInputIsAvailable = true;
            }
          }
        });

        return supportedTypeInputIsAvailable;
      } else {
        if (isTypeSupported(inputNodeType)) {
          return true;
        }
      }

      return false;
    },
    [inputs, isTypeSupported]
  );

  const isValidConnection = useCallback(
    (connection: ReactFlowConnection): boolean => {
      if (connection.source && connection.target) {
        const currentNodeConnection = connectionDictionary[connection.target];
        const inputSourceSchemaNode = flattenedSourceSchema[connection.source];
        const inputFunctionNode = functionDictionary[connection.source];

        // Make sure there's available inputs
        if (currentNodeConnection) {
          const numInputsWithValue = currentNodeConnection.inputs.filter((input) => !!input).length;
          if (numInputsWithValue === maxNumberOfInputs) {
            return false;
          }
        }

        // If source schema node, validate type against Function inputs
        if (inputSourceSchemaNode) {
          return isTypeSupportedAndAvailable(currentNodeConnection, inputSourceSchemaNode.normalizedDataType);
        } else if (inputFunctionNode) {
          // If function node, validate output type against Function inputs
          return isTypeSupportedAndAvailable(currentNodeConnection, inputFunctionNode.outputValueType);
        }

        return false;
      }

      return false;
    },
    [isTypeSupportedAndAvailable, maxNumberOfInputs, flattenedSourceSchema, functionDictionary, connectionDictionary]
  );

  return (
    <div className={classes.container}>
      {displayHandle && maxNumberOfInputs !== 0 && (
        <Handle type="target" position={Position.Left} style={handleStyle} isValidConnection={isValidConnection} />
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

      {displayHandle && <Handle type="source" position={Position.Right} style={handleStyle} />}
    </div>
  );
};
