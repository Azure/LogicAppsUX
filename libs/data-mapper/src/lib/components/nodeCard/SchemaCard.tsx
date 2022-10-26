import { childTargetNodeCardWidth, schemaNodeCardHeight, schemaNodeCardWidth } from '../../constants/NodeConstants';
import { setCurrentTargetSchemaNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { store } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import { SchemaNodeProperties, SchemaType } from '../../models';
import type { Connection } from '../../models/Connection';
import { flattenInputs, isValidInputToFunctionNode, isValidSchemaNodeToSchemaNodeConnection } from '../../utils/Connection.Utils';
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
  Tooltip,
  typographyStyles,
} from '@fluentui/react-components';
import { bundleIcon, ChevronRight16Regular, Important12Filled } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { Connection as ReactFlowConnection, NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

const useStyles = makeStyles({
  container: {
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'row',
    height: `${schemaNodeCardHeight}px`,
    width: `${schemaNodeCardWidth}px`,
    opacity: 1,
    float: 'right',
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
    float: 'right',
    width: '272px',
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
    color: tokens.colorBrandForeground2,
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
    marginBottom: '30px',
  },
  outputArrayBadge: {
    marginRight: '6px',
    marginLeft: '-22px',
    marginBottom: '30px',
  },
});

const handleStyle: React.CSSProperties = { zIndex: 5, width: '10px', height: '10px', display: 'hidden' };

const isValidConnection = (connection: ReactFlowConnection): boolean => {
  const flattenedSourceSchema = store.getState().dataMap.curDataMapOperation.flattenedSourceSchema;
  const functionDictionary = store.getState().dataMap.curDataMapOperation.currentFunctionNodes;
  const flattenedTargetSchema = store.getState().dataMap.curDataMapOperation.flattenedTargetSchema;
  const connectionDictionary = store.getState().dataMap.curDataMapOperation.dataMapConnections;

  if (connection.source && connection.target && flattenedSourceSchema && flattenedTargetSchema && functionDictionary) {
    const sourceSchemaNode = flattenedSourceSchema[connection.source];
    // Target is either a function, or target schema, node
    const targetFunctionNode = functionDictionary[connection.target];
    const targetSchemaNode = flattenedTargetSchema[connection.target];
    const currentTargetConnection = connectionDictionary[connection.target];

    if (targetFunctionNode) {
      return isValidInputToFunctionNode(
        sourceSchemaNode.normalizedDataType,
        currentTargetConnection,
        targetFunctionNode.maxNumberOfInputs,
        targetFunctionNode.inputs
      );
    }

    if (targetSchemaNode) {
      return isValidSchemaNodeToSchemaNodeConnection(sourceSchemaNode.schemaNodeDataType, targetSchemaNode.schemaNodeDataType);
    }

    return false;
  }

  return false;
};

export interface SchemaCardProps extends CardProps {
  schemaNode: SchemaNodeExtended;
  schemaType: SchemaType;
  displayHandle: boolean;
  displayChevron: boolean;
  isLeaf: boolean;
  isChild: boolean;
  relatedConnections: Connection[];
}

export const SchemaCard = (props: NodeProps<SchemaCardProps>) => {
  const reactFlowId = props.id;
  const { schemaNode, schemaType, isLeaf, isChild, onClick, disabled, error, displayHandle, displayChevron } = props.data;
  const dispatch = useDispatch<AppDispatch>();
  const sharedStyles = getStylesForSharedState();
  const classes = useStyles();

  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const [_isHovered, setIsHovered] = useState<boolean>(false);

  const isNodeConnected = useMemo(() => {
    return (
      connections[reactFlowId] && (connections[reactFlowId].outputs.length > 0 || flattenInputs(connections[reactFlowId].inputs).length > 0)
    );
  }, [connections, reactFlowId]);

  const isSourceSchemaNode = useMemo(() => schemaType === SchemaType.Source, [schemaType]);
  const isOutputChildNode = useMemo(() => !isSourceSchemaNode && isChild, [isSourceSchemaNode, isChild]);
  const showOutputChevron = useMemo(() => !isSourceSchemaNode && !isLeaf && displayChevron, [isSourceSchemaNode, displayChevron, isLeaf]);
  const isNBadgeRequired = useMemo(
    () => isNodeConnected && schemaNode.properties === SchemaNodeProperties.Repeating,
    [isNodeConnected, schemaNode]
  );

  const containerStyle = useMemo(() => {
    const newContStyles = [sharedStyles.root, classes.container];

    if (isOutputChildNode) {
      newContStyles.push(classes.outputChildCard);
    }

    if (disabled) {
      newContStyles.push(classes.disabled);
    }

    return mergeClasses(...newContStyles);
  }, [isOutputChildNode, disabled, classes, sharedStyles]);

  const outputChevronOnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(setCurrentTargetSchemaNode(schemaNode));
  };

  const ExclamationIcon = bundleIcon(Important12Filled, Important12Filled);
  const BundledTypeIcon = icon24ForSchemaNodeType(schemaNode.schemaNodeDataType, schemaNode.properties);

  return (
    <div className={classes.badgeContainer}>
      {isNBadgeRequired && !isSourceSchemaNode && <NBadge />}

      <div className={containerStyle} onMouseLeave={() => setIsHovered(false)} onMouseEnter={() => setIsHovered(true)}>
        {displayHandle && (
          <Handle
            type={isSourceSchemaNode ? 'source' : 'target'}
            position={isSourceSchemaNode ? Position.Right : Position.Left}
            style={handleStyle}
            isValidConnection={isSourceSchemaNode ? isValidConnection : () => false}
          />
        )}
        {error && <Badge size="small" icon={<ExclamationIcon />} color="danger" className={classes.errorBadge}></Badge>}{' '}
        <Button disabled={!!disabled} onClick={onClick} appearance={'transparent'} className={classes.contentButton}>
          <span className={classes.cardIcon}>
            <BundledTypeIcon />
          </span>

          <Text className={classes.cardText} style={{ width: !isSourceSchemaNode ? '100%' : '136px' }} block={true} nowrap={true}>
            {schemaNode.name}
          </Text>
        </Button>
        {showOutputChevron && (
          <Button
            className={classes.cardChevron}
            onClick={outputChevronOnClick}
            icon={<ChevronRight16Regular />}
            appearance={'transparent'}
          />
        )}
      </div>

      {isNBadgeRequired && isSourceSchemaNode && <NBadge />}
    </div>
  );
};

const NBadge = () => {
  const intl = useIntl();
  const classes = useStyles();

  const arrayMappingTooltip = intl.formatMessage({
    defaultMessage: 'Array Mapping',
    description: 'Label for array connection',
  });

  return (
    <div>
      <Tooltip content={arrayMappingTooltip} relationship="label">
        <Badge className={classes.outputArrayBadge} shape="rounded" size="small" appearance="tint" color="informative">
          N
        </Badge>
      </Tooltip>
    </div>
  );
};
