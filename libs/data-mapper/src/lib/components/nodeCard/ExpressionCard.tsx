import type { ExpressionGroupBranding } from '../../constants/ExpressionConstants';
import { store } from '../../core/state/Store';
import type { ExpressionInput } from '../../models/Expression';
import { iconUriForIconImageName } from '../../utils/Icon.Utils';
import type { CardProps } from './NodeCard';
import { getStylesForSharedState } from './NodeCard';
import {
  Button,
  createFocusOutlineStyle,
  Image,
  makeStyles,
  mergeClasses,
  PresenceBadge,
  shorthands,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import type { FunctionComponent } from 'react';
import type { Connection as ReactFlowConnection, NodeProps } from 'react-flow-renderer';
import { Handle, Position } from 'react-flow-renderer';

export type ExpressionCardProps = {
  expressionName: string;
  numberOfInputs: number;
  inputs: ExpressionInput[];
  iconFileName?: string;
  expressionBranding: ExpressionGroupBranding;
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

const isValidConnection = (connection: ReactFlowConnection, inputs: ExpressionInput[]): boolean => {
  const flattenedInputSchema = store.getState().dataMap.curDataMapOperation.flattenedInputSchema;

  if (connection.source && connection.target && flattenedInputSchema) {
    const inputNode = flattenedInputSchema[connection.source];

    // For now just allow all expression to expression
    // TODO validate express to expression connections
    return (
      !inputNode ||
      inputs.some((input) => input.acceptableInputTypes.some((acceptableType) => acceptableType === inputNode.schemaNodeDataType))
    );
  }

  return false;
};

export const ExpressionCard: FunctionComponent<NodeProps<ExpressionCardProps>> = (props: NodeProps<ExpressionCardProps>) => {
  const { expressionName, numberOfInputs, inputs, disabled, error, expressionBranding, iconFileName, displayHandle, onClick } = props.data;
  const classes = useStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  return (
    <div className={classes.container}>
      {displayHandle && numberOfInputs !== 0 ? (
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
          children: <Text size={200}>{expressionName}</Text>,
        }}
        relationship="label"
      >
        {/* TODO light vs dark theming on expression branding */}
        <Button onClick={onClick} color={expressionBranding.colorLight} className={mergedClasses} disabled={!!disabled}>
          {iconFileName ? (
            <Image src={iconUriForIconImageName(iconFileName)} height={20} width={20} alt={expressionName} />
          ) : (
            <>{expressionBranding.icon}</>
          )}
        </Button>
      </Tooltip>
      {displayHandle ? <Handle type={'source'} position={Position.Right} style={handleStyle} /> : null}
    </div>
  );
};
