import { childTargetNodeCardWidth, schemaNodeCardHeight, schemaNodeCardWidth } from '../../constants/NodeConstants';
import { setCurrentTargetSchemaNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { store } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import { SchemaNodeProperty, SchemaType } from '../../models';
import type { Connection } from '../../models/Connection';
import { isTextUsingEllipsis } from '../../utils/Browser.Utils';
import { flattenInputs, isValidInputToFunctionNode, isValidSchemaNodeToSchemaNodeConnection } from '../../utils/Connection.Utils';
import { iconForSchemaNodeDataType } from '../../utils/Icon.Utils';
import type { CardProps } from './NodeCard';
import { getStylesForSharedState, selectedCardStyles } from './NodeCard';
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
import { bundleIcon, ChevronRight16Filled, ChevronRight16Regular, Important12Filled } from '@fluentui/react-icons';
import { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { Connection as ReactFlowConnection, NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

const badgeContainerWidth = schemaNodeCardWidth + 72;
const contentBtnWidth = schemaNodeCardWidth - 30;

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
      ...selectedCardStyles,
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
    width: `${badgeContainerWidth}px`,
  },
  contentButton: {
    height: '48px',
    width: `${contentBtnWidth}px`,
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
    ...shorthands.overflow('hidden'),
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
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
  schemaChildCard: {
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

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);
  const sourceNodeConnectionBeingDrawnFromId = useSelector((state: RootState) => state.dataMap.sourceNodeConnectionBeingDrawnFromId);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const schemaNameTextRef = useRef<HTMLDivElement>(null);
  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);
  const [isChevronHovered, setIsChevronHovered] = useState<boolean>(false);
  const [isTooltipEnabled, setIsTooltipEnabled] = useState<boolean>(false);

  const isNodeConnected = useMemo(
    () =>
      connections[reactFlowId] &&
      (connections[reactFlowId].outputs.length > 0 || flattenInputs(connections[reactFlowId].inputs).length > 0),
    [connections, reactFlowId]
  );

  const isSourceSchemaNode = useMemo(() => schemaType === SchemaType.Source, [schemaType]);
  const showOutputChevron = useMemo(() => !isSourceSchemaNode && !isLeaf && displayChevron, [isSourceSchemaNode, displayChevron, isLeaf]);
  const isNBadgeRequired = useMemo(
    () => isNodeConnected && schemaNode.nodeProperties.indexOf(SchemaNodeProperty.Repeating) > -1,
    [isNodeConnected, schemaNode]
  );
  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);
  const shouldDisplayHandles = useMemo<boolean>(
    () =>
      displayHandle && !isSourceSchemaNode
        ? !!sourceNodeConnectionBeingDrawnFromId
        : sourceNodeConnectionBeingDrawnFromId === reactFlowId || isCardHovered || isCurrentNodeSelected,
    [displayHandle, isSourceSchemaNode, sourceNodeConnectionBeingDrawnFromId, isCardHovered, isCurrentNodeSelected, reactFlowId]
  );

  const shouldNameTooltipDisplay = schemaNameTextRef?.current ? isTextUsingEllipsis(schemaNameTextRef.current) : false;

  const containerStyle = useMemo(() => {
    const newContStyles = [sharedStyles.root, classes.container];

    // Need to style both source and target schema child nodes on overview
    // - doesn't seem to affect canvas source schema nodes
    if (isChild) {
      newContStyles.push(classes.schemaChildCard);
    }

    if (disabled) {
      newContStyles.push(classes.disabled);
    }

    return mergeClasses(...newContStyles);
  }, [isChild, disabled, classes, sharedStyles]);

  const outputChevronOnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(setCurrentTargetSchemaNode(schemaNode));
  };

  const ExclamationIcon = bundleIcon(Important12Filled, Important12Filled);
  const ChevronIcon = bundleIcon(ChevronRight16Filled, ChevronRight16Regular);
  const BundledTypeIcon = iconForSchemaNodeDataType(schemaNode.schemaNodeDataType, 24, false, schemaNode.nodeProperties);

  return (
    <div className={classes.badgeContainer}>
      {isNBadgeRequired && !isSourceSchemaNode && <NBadge />}

      <div
        className={containerStyle}
        style={isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId ? selectedCardStyles : undefined}
        onMouseLeave={() => setIsCardHovered(false)}
        onMouseEnter={() => setIsCardHovered(true)}
      >
        <Handle
          type={isSourceSchemaNode ? 'source' : 'target'}
          position={isSourceSchemaNode ? Position.Right : Position.Left}
          style={{
            ...handleStyle,
            visibility: shouldDisplayHandles ? 'visible' : 'hidden',
          }}
          isValidConnection={isSourceSchemaNode ? isValidConnection : () => false}
        />
        {error && <Badge size="small" icon={<ExclamationIcon />} color="danger" className={classes.errorBadge}></Badge>}{' '}
        <Button disabled={!!disabled} onClick={onClick} appearance={'transparent'} className={classes.contentButton}>
          <span className={classes.cardIcon}>
            <BundledTypeIcon />
          </span>

          <Tooltip
            relationship="label"
            content={schemaNode.name}
            visible={shouldNameTooltipDisplay && isTooltipEnabled}
            onVisibleChange={(_ev, data) => setIsTooltipEnabled(data.visible)}
          >
            <div
              ref={schemaNameTextRef}
              className={classes.cardText}
              style={{ width: !isSourceSchemaNode ? `${contentBtnWidth}px` : '136px' }}
            >
              {schemaNode.name}
            </div>
          </Tooltip>
        </Button>
        {showOutputChevron && (
          <Button
            className={classes.cardChevron}
            onClick={outputChevronOnClick}
            icon={<ChevronIcon filled={isChevronHovered ? true : undefined} />}
            appearance={'transparent'}
            onMouseEnter={() => setIsChevronHovered(true)}
            onMouseLeave={() => setIsChevronHovered(false)}
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
