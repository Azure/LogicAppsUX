import { store } from '../../core/state/Store';
import type { SchemaNodeDataType } from '../../models';
import { SchemaTypes } from '../../models';
import { icon24ForSchemaNodeType } from '../../utils/Icon.Utils';
import type { CardProps } from './NodeCard';
import { getStylesForSharedState } from './NodeCard';
import { Text } from '@fluentui/react';
import {
  Badge,
  Button,
  createFocusOutlineStyle,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { bundleIcon, ChevronRight16Regular, Important12Filled } from '@fluentui/react-icons';
import type { FunctionComponent } from 'react';
import type { Connection as ReactFlowConnection, NodeProps } from 'react-flow-renderer';
import { Handle, Position } from 'react-flow-renderer';

export type SchemaCardProps = {
  label: string;
  schemaType: SchemaTypes;
  displayHandle: boolean;
  isLeaf: boolean;
  nodeDataType: SchemaNodeDataType;
} & CardProps;

const useStyles = makeStyles({
  root: {
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'row',
    height: '48px',
    opacity: 1,
    width: '200px',
    alignItems: 'center',
    justifyContent: 'left',
    ...shorthands.gap('8px'),
    ...shorthands.margin('2px'),

    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1,
    },
    '&:active': {
      '&:hover': {
        backgroundColor: tokens.colorNeutralBackground1,
      },
    },
  },
  badge: {
    position: 'absolute',
    top: '-7px',
    right: '-10px',
    zIndex: '1',
  },
  cardIcon: {
    backgroundColor: tokens.colorBrandBackground2,
    width: '48px',
    borderStartStartRadius: tokens.borderRadiusMedium,
    borderEndStartRadius: tokens.borderRadiusMedium,
    color: tokens.colorBrandForeground1,
    fontSize: '24px',
    lineHeight: '48px',
    textAlign: 'center',
    flexGrow: '0',
    flexShrink: '0',
    flexBasis: '44px',
  },
  container: { height: '48px', width: '200px', isolation: 'isolate', position: 'relative' },
  cardText: {
    ...typographyStyles.body1Strong,
    display: 'inline-block',
    alignSelf: 'center',
    color: tokens.colorNeutralForeground1,
    textAlign: 'left',
    width: '112px',
  },
  cardChevron: {
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    fontSize: '16px',

    justifyContent: 'right',
  },
  disabled: {
    opacity: 0.38,
  },

  focusIndicator: createFocusOutlineStyle({
    style: {
      outlineRadius: '5px',
    },
  }),
});

const cardInputText = makeStyles({
  cardText: {
    width: '136px',
  },
});

const handleStyle: React.CSSProperties = { zIndex: 5, width: '10px', height: '10px' };

const isValidConnection = (connection: ReactFlowConnection): boolean => {
  const flattenedInputSchema = store.getState().dataMap.curDataMapOperation.flattenedInputSchema;
  const flattenedOutputSchema = store.getState().dataMap.curDataMapOperation.flattenedOutputSchema;

  if (connection.source && connection.target && flattenedInputSchema && flattenedOutputSchema) {
    const inputNode = flattenedInputSchema[connection.source];
    const outputNode = flattenedOutputSchema[connection.target];

    return inputNode.schemaNodeDataType === outputNode.schemaNodeDataType;
  }

  return false;
};

export const SchemaCard: FunctionComponent<NodeProps<SchemaCardProps>> = (props: NodeProps<SchemaCardProps>) => {
  const { label, schemaType, isLeaf, onClick, disabled, error, displayHandle, nodeDataType } = props.data;

  const classes = useStyles();
  const sharedStyles = getStylesForSharedState();
  const mergedButtonClasses = mergeClasses(sharedStyles.root, classes.root);
  const mergedInputText = mergeClasses(classes.cardText, cardInputText().cardText);
  const errorClass = mergeClasses(mergedButtonClasses, sharedStyles.error);

  const showOutputChevron = schemaType === SchemaTypes.Output && !isLeaf;

  const ExclamationIcon = bundleIcon(Important12Filled, Important12Filled);
  const BundledTypeIcon = icon24ForSchemaNodeType(nodeDataType);

  return (
    <div className={disabled ? mergeClasses(classes.container, classes.disabled) : classes.container}>
      {displayHandle && isLeaf ? (
        <Handle
          type={schemaType === SchemaTypes.Input ? 'source' : 'target'}
          position={schemaType === SchemaTypes.Input ? Position.Right : Position.Left}
          style={handleStyle}
          isValidConnection={isValidConnection}
        />
      ) : null}
      {error && <Badge size="small" icon={<ExclamationIcon />} color="danger" className={classes.badge}></Badge>}
      <Button className={error ? errorClass : mergedButtonClasses} disabled={!!disabled} onClick={onClick}>
        <span className={classes.cardIcon}>
          <BundledTypeIcon />
        </span>
        <Text className={schemaType === SchemaTypes.Output ? classes.cardText : mergedInputText} block={true} nowrap={true}>
          {label}
        </Text>
        {showOutputChevron && (
          <div className={classes.cardChevron}>
            <ChevronRight16Regular />
          </div>
        )}
      </Button>
    </div>
  );
};
