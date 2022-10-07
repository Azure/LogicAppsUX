import type { FunctionGroupBranding } from '../../constants/FunctionConstants';
import { customTokens } from '../../core';
import { store } from '../../core/state/Store';
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
import type { FunctionComponent } from 'react';
import type { Connection as ReactFlowConnection, NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

export type FunctionCardProps = {
  functionName: string;
  maxNumberOfInputs: number;
  inputs: FunctionInput[];
  iconFileName?: string;
  functionBranding: FunctionGroupBranding;
} & CardProps;

const useStyles = makeStyles({
  root: {
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    backgroundColor: '#8764b8',
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
        backgroundColor: '#8764b8',
        color: tokens.colorNeutralForegroundInverted,
      },
    },

    '&:enabled': {
      '&:hover': {
        backgroundColor: '#8764b8',
        color: 'white',
      },
      '&:focus': {
        backgroundColor: '#8764b8',
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

const isValidConnection = (connection: ReactFlowConnection, inputs: FunctionInput[]): boolean => {
  const flattenedSourceSchema = store.getState().dataMap.curDataMapOperation.flattenedSourceSchema;

  if (connection.source && connection.target && flattenedSourceSchema) {
    const sourceNode = flattenedSourceSchema[connection.source];

    // For now just allow all function to function
    // TODO validate express to function connections
    return (
      !sourceNode || inputs.some((input) => input.allowedTypes.some((acceptableType) => acceptableType === sourceNode.normalizedDataType))
    );
  }

  return false;
};

export const FunctionCard: FunctionComponent<NodeProps<FunctionCardProps>> = (props: NodeProps<FunctionCardProps>) => {
  const { functionName, maxNumberOfInputs, inputs, disabled, error, functionBranding, iconFileName, displayHandle, onClick } = props.data;
  const classes = useStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  return (
    <div className={classes.container}>
      {displayHandle && maxNumberOfInputs !== 0 ? (
        <Handle
          type={'target'}
          position={Position.Left}
          style={handleStyle}
          isValidConnection={(connection) => isValidConnection(connection, inputs)}
        />
      ) : null}

      {error && <PresenceBadge size="extra-small" status="busy" className={classes.badge}></PresenceBadge>}
      <Tooltip
        content={{
          children: <Text size={200}>{functionName}</Text>,
        }}
        relationship="label"
      >
        <Button onClick={onClick} color={customTokens[functionBranding.colorTokenName]} className={mergedClasses} disabled={!!disabled}>
          {getIconForFunction(functionName, iconFileName, functionBranding)}
        </Button>
      </Tooltip>
      {displayHandle ? <Handle type={'source'} position={Position.Right} style={handleStyle} /> : null}
    </div>
  );
};
