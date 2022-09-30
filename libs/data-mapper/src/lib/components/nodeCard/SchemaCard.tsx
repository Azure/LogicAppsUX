import { childTargetNodeCardWidth, nodeCardWidth } from '../../constants/NodeConstants';
import { setCurrentTargetNode } from '../../core/state/DataMapSlice';
import type { AppDispatch } from '../../core/state/Store';
import { store } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import { SchemaTypes, SchemaNodeProperties } from '../../models';
import type { Connection } from '../../models/Connection';
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
import { useDispatch } from 'react-redux';
import type { Connection as ReactFlowConnection, NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

export type SchemaCardProps = {
  schemaNode: SchemaNodeExtended;
  schemaType: SchemaTypes;
  displayHandle: boolean;
  displayChevron: boolean;
  isLeaf: boolean;
  isChild: boolean;
  childArrayConnections: Connection[];
} & CardProps;

const useStyles = makeStyles({
  container: {
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'row',
    height: '48px',
    opacity: 1,
    width: `${nodeCardWidth}px`,
    alignItems: 'center',
    justifyContent: 'left',
    ...shorthands.gap('8px'),
    ...shorthands.margin('2px'),
    isolation: 'isolate',
    '&:hover': {
      boxShadow: tokens.shadow8,
    },
    '&:active': {
      '&:hover': {
        backgroundColor: tokens.colorNeutralBackground1,
      },
    },
    '&:focus-within': {
      outlineWidth: tokens.strokeWidthThick,
      outlineColor: tokens.colorBrandStroke1,
      outlineStyle: 'solid',
      opacity: 1,
      boxShadow: tokens.shadow4,
    },
  },
  errorBadge: {
    position: 'absolute',
    top: '-7px',
    right: '-10px',
    zIndex: '1',
  },
  badgeContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  contentButton: {
    height: '48px',
    width: '170px',
    ...shorthands.border('0px'),
    ...shorthands.padding('0px'),
    marginRight: '0px',
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
    marginRight: '8px',
  },
  cardText: {
    ...typographyStyles.body1Strong,
    display: 'inline-block',
    alignSelf: 'center',
    color: tokens.colorNeutralForeground1,
    textAlign: 'left',
    width: '100%',
  },
  cardChevron: {
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    fontSize: '16px',
    flexBasis: '48px',
    justifyContent: 'right',
  },
  disabled: {
    opacity: 0.38,
  },
  outputChildCard: {
    width: `${childTargetNodeCardWidth}px`,
  },

  focusIndicator: createFocusOutlineStyle({
    style: {
      outlineRadius: '5px',
    },
  }),
  inputArrayBadge: {
    marginLeft: '6px',
  },
  outputArrayBadge: {
    marginRight: '6px',
  },
});

const cardInputText = makeStyles({
  cardText: {
    width: '136px',
  },
});

const handleStyle: React.CSSProperties = { zIndex: 5, width: '10px', height: '10px' };

const isValidConnection = (connection: ReactFlowConnection): boolean => {
  const flattenedSourceSchema = store.getState().dataMap.curDataMapOperation.flattenedSourceSchema;
  const flattenedTargetSchema = store.getState().dataMap.curDataMapOperation.flattenedTargetSchema;

  if (connection.source && connection.target && flattenedSourceSchema && flattenedTargetSchema) {
    const sourceNode = flattenedSourceSchema[connection.source];
    const targetNode = flattenedTargetSchema[connection.target];

    // If we have no targetNode that means it's an function and just allow the connection for now
    // TODO validate function allowed input types
    return !targetNode || sourceNode.schemaNodeDataType === targetNode.schemaNodeDataType;
  }

  return false;
};

export const SchemaCard: FunctionComponent<NodeProps<SchemaCardProps>> = (props: NodeProps<SchemaCardProps>) => {
  const { schemaNode, schemaType, isLeaf, isChild, onClick, disabled, error, displayHandle, displayChevron, childArrayConnections } =
    props.data;
  const dispatch = useDispatch<AppDispatch>();
  const classes = useStyles();
  const sharedStyles = getStylesForSharedState();
  const mergedInputText = mergeClasses(classes.cardText, cardInputText().cardText);

  const isOutputChildNode = schemaType === SchemaTypes.Target && isChild;

  const containerStyleClasses = [sharedStyles.root, classes.container];
  if (isOutputChildNode) {
    containerStyleClasses.push(classes.outputChildCard);
  }

  if (disabled) {
    containerStyleClasses.push(classes.disabled);
  }

  const containerStyle = mergeClasses(...containerStyleClasses);

  const showOutputChevron = schemaType === SchemaTypes.Target && !isLeaf && displayChevron;

  const ExclamationIcon = bundleIcon(Important12Filled, Important12Filled);
  const BundledTypeIcon = icon24ForSchemaNodeType(schemaNode.schemaNodeDataType, schemaNode.properties);

  const outputChevronOnClick = (newCurrentSchemaNode: SchemaNodeExtended) => {
    dispatch(setCurrentTargetNode({ schemaNode: newCurrentSchemaNode, resetSelectedSourceNodes: true }));
  };

  const isNBadgeRequired = childArrayConnections.length > 0 && schemaNode.properties === SchemaNodeProperties.Repeating;

  return (
    <div className={classes.badgeContainer}>
      {isNBadgeRequired && schemaType === SchemaTypes.Target && (
        <Badge className={classes.outputArrayBadge} shape="rounded" size="small" appearance="tint" color="informative">
          N
        </Badge>
      )}
      <div className={containerStyle}>
        {displayHandle ? (
          <Handle
            type={schemaType === SchemaTypes.Source ? 'source' : 'target'}
            position={schemaType === SchemaTypes.Source ? Position.Right : Position.Left}
            style={handleStyle}
            isValidConnection={isValidConnection}
          />
        ) : null}
        {error && <Badge size="small" icon={<ExclamationIcon />} color="danger" className={classes.errorBadge}></Badge>}{' '}
        <Button disabled={!!disabled} onClick={onClick} appearance={'transparent'} className={classes.contentButton}>
          <span className={classes.cardIcon}>
            <BundledTypeIcon />
          </span>
          <Text className={schemaType === SchemaTypes.Target ? classes.cardText : mergedInputText} block={true} nowrap={true}>
            {schemaNode.name}
          </Text>
        </Button>
        {showOutputChevron && (
          <Button
            className={classes.cardChevron}
            onClick={(e) => {
              e.stopPropagation();
              outputChevronOnClick(schemaNode);
            }}
            icon={<ChevronRight16Regular />}
            appearance={'transparent'}
          />
        )}
      </div>
      {isNBadgeRequired && schemaType === SchemaTypes.Source && (
        <Badge className={classes.inputArrayBadge} shape="rounded" size="small" appearance="tint" color="informative">
          N
        </Badge>
      )}
    </div>
  );
};
