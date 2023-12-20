import { schemaNodeCardDefaultWidth, schemaNodeCardHeight } from '../../constants/NodeConstants';
import { ReactFlowNodeType } from '../../constants/ReactFlowConstants';
import { removeSourceSchemaNodes, setCurrentTargetSchemaNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { isTextUsingEllipsis } from '../../utils/Browser.Utils';
import { collectSourceNodesForConnectionChain, collectTargetNodesForConnectionChain } from '../../utils/Connection.Utils';
import { iconForNormalizedDataType } from '../../utils/Icon.Utils';
import { areInputTypesValidForSchemaNode } from '../../utils/MapChecker.Utils';
import { isNodeHighlighted } from '../../utils/ReactFlow.Util';
import { ItemToggledState } from '../tree/TargetSchemaTreeItem';
import HandleWrapper from './HandleWrapper';
import type { CardProps } from './NodeCard';
import { getStylesForSharedState, highlightedCardStyles, selectedCardStyles } from './NodeCard';
import {
  Badge,
  Button,
  MenuItem,
  Tooltip,
  createFocusOutlineStyle,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import {
  CheckmarkCircle12Filled,
  ChevronRight16Filled,
  ChevronRight16Regular,
  Circle12Regular,
  CircleHalfFill12Regular,
  Important12Filled,
  Delete24Filled,
  Delete24Regular,
  bundleIcon,
} from '@fluentui/react-icons';
import { CardContextMenu, useCardContextMenu } from '@microsoft/designer-ui';
import type { SchemaNodeExtended } from '@microsoft/utils-logic-apps';
import { SchemaNodeProperty, SchemaType } from '@microsoft/utils-logic-apps';
import { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { NodeProps } from 'reactflow';
import { Position } from 'reactflow';

const useStyles = makeStyles({
  container: {
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'row',
    height: `${schemaNodeCardHeight}px`,
    width: `${schemaNodeCardDefaultWidth}px`,
    opacity: 1,
    float: 'right',
    alignItems: 'center',
    justifyContent: 'left',
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
  },
  contentButton: {
    height: '48px',
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
  nPopover: {
    paddingTop: '5px',
    paddingBottom: '7px',
    zIndex: 4,
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
    '&:hover': {
      color: tokens.colorNeutralForeground3,
    },
    '&:active': {
      color: `${tokens.colorNeutralForeground3} !important`,
    },
  },
  disabled: {
    opacity: 0.38,
  },

  focusIndicator: createFocusOutlineStyle({
    style: {
      outlineRadius: '5px',
    },
  }),
  inputArrayBadge: {
    marginLeft: '6px',
    marginBottom: '5px',
  },
  outputArrayBadge: {
    marginRight: '6px',
    marginLeft: '-22px',
    marginBottom: '5px',
  },
});

export interface SchemaCardProps extends CardProps {
  schemaNode: SchemaNodeExtended;
  schemaType: SchemaType;
  displayHandle: boolean;
  displayChevron: boolean;
  isLeaf: boolean;
  width: number;
  disableContextMenu: boolean;
  connectionStatus?: ItemToggledState;
}

export const SchemaCard = (props: NodeProps<SchemaCardProps>) => {
  const reactFlowId = props.id;
  const { schemaNode, schemaType, isLeaf, onClick, disabled, displayHandle, displayChevron, connectionStatus, width, disableContextMenu } =
    props.data;
  const dispatch = useDispatch<AppDispatch>();
  const sharedStyles = getStylesForSharedState();
  const classes = useStyles();
  const intl = useIntl();

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);
  const selectedItemConnectedNodes = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes
  );
  const sourceNodeConnectionBeingDrawnFromId = useSelector(
    (state: RootState) => state.dataMap.present.sourceNodeConnectionBeingDrawnFromId
  );
  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  const schemaNameTextRef = useRef<HTMLDivElement>(null);
  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);
  const [isChevronHovered, setIsChevronHovered] = useState<boolean>(false);
  const [isTooltipEnabled, setIsTooltipEnabled] = useState<boolean>(false);

  const connectedNodes = useMemo(
    () =>
      reactFlowId && connections[reactFlowId]
        ? [
            ...collectSourceNodesForConnectionChain(connections[reactFlowId], connections),
            ...collectTargetNodesForConnectionChain(connections[reactFlowId], connections),
          ]
        : [],
    // Only want to update when that specific connection updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reactFlowId, connections[reactFlowId]]
  );
  const isNodeConnected = useMemo(() => connectedNodes.length > 0, [connectedNodes]);
  const isSourceSchemaNode = useMemo(() => schemaType === SchemaType.Source, [schemaType]);
  const showOutputChevron = useMemo(() => !isSourceSchemaNode && !isLeaf && displayChevron, [isSourceSchemaNode, displayChevron, isLeaf]);
  const isNBadgeRequired = useMemo(
    () => isNodeConnected && schemaNode.nodeProperties.indexOf(SchemaNodeProperty.Repeating) > -1,
    [isNodeConnected, schemaNode]
  );
  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);
  const isCurrentNodeHighlighted = useMemo<boolean>(() => {
    return isNodeHighlighted(isCurrentNodeSelected, reactFlowId, selectedItemConnectedNodes);
  }, [isCurrentNodeSelected, reactFlowId, selectedItemConnectedNodes]);

  const shouldDisplaySourceHandle = displayHandle && !sourceNodeConnectionBeingDrawnFromId && (isCardHovered || isCurrentNodeSelected);
  const shouldDisplayTargetHandle = displayHandle && !!sourceNodeConnectionBeingDrawnFromId;

  // NOTE: This isn't memo'd to play nice with the element refs
  const shouldNameTooltipDisplay: boolean = schemaNameTextRef?.current ? isTextUsingEllipsis(schemaNameTextRef.current) : false;

  const containerStyle = useMemo(() => {
    const newContStyles = [sharedStyles.root, classes.container, 'nopan'];

    if (disabled) {
      newContStyles.push(classes.disabled);
    }

    return mergeClasses(...newContStyles);
  }, [disabled, classes, sharedStyles]);

  const connectionStatusIcon = useMemo(() => {
    switch (connectionStatus) {
      case ItemToggledState.Completed:
        return <CheckmarkCircle12Filled primaryFill={tokens.colorPaletteGreenForeground1} />;
      case ItemToggledState.InProgress:
        return <CircleHalfFill12Regular primaryFill={tokens.colorPaletteYellowForeground1} />;
      case ItemToggledState.NotStarted:
        return <Circle12Regular primaryFill={tokens.colorNeutralForegroundDisabled} />;
      default:
        return null;
    }
  }, [connectionStatus]);

  const isInputValid = useMemo(() => {
    const curConn = connections[reactFlowId];

    // Only calculate validity if a target schema node with an input
    if (isSourceSchemaNode || !curConn || !isNodeConnected) {
      return true;
    }

    return areInputTypesValidForSchemaNode(schemaNode, curConn);
  }, [connections, reactFlowId, isSourceSchemaNode, isNodeConnected, schemaNode]);

  const outputChevronOnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(setCurrentTargetSchemaNode(schemaNode));
  };

  const ExclamationIcon = bundleIcon(Important12Filled, Important12Filled);
  const ChevronIcon = bundleIcon(ChevronRight16Filled, ChevronRight16Regular);
  const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);

  const BundledTypeIcon = iconForNormalizedDataType(schemaNode.type, 24, false, schemaNode.nodeProperties);
  const contextMenu = useCardContextMenu();
  const ariaDescribeChevron = intl.formatMessage({
    defaultMessage: 'Navigate to element and view children',
    description: "Change context of the canvas to view that element's children",
  });

  const RemoveMenuItem = () => {
    const deleteNode = intl.formatMessage({
      defaultMessage: 'Remove',
      description: 'Remove card from canvas',
    });
    return (
      <MenuItem
        key={deleteNode}
        disabled={!isSourceSchemaNode}
        icon={<DeleteIcon />}
        onClick={() => dispatch(removeSourceSchemaNodes([schemaNode]))}
      >
        {deleteNode}
      </MenuItem>
    );
  };

  const nodeStyles =
    isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId
      ? selectedCardStyles
      : isCurrentNodeHighlighted
      ? highlightedCardStyles
      : undefined;

  return (
    <div className={classes.badgeContainer}>
      {isNBadgeRequired && !isSourceSchemaNode && <NBadge isOutput />}
      <div
        onContextMenu={contextMenu.handle}
        className={containerStyle}
        style={{ ...nodeStyles, width }}
        onMouseLeave={() => setIsCardHovered(false)}
        onMouseEnter={() => setIsCardHovered(true)}
      >
        <HandleWrapper
          type={isSourceSchemaNode ? SchemaType.Source : SchemaType.Target}
          position={isSourceSchemaNode ? Position.Right : Position.Left}
          nodeReactFlowType={ReactFlowNodeType.SchemaNode}
          nodeReactFlowId={reactFlowId}
          shouldDisplay={isSourceSchemaNode ? shouldDisplaySourceHandle : shouldDisplayTargetHandle}
        />
        {!isInputValid && <Badge size="small" icon={<ExclamationIcon />} color="danger" className={classes.errorBadge} />}
        {connectionStatusIcon && <span style={{ position: 'absolute', right: -16, top: 0 }}>{connectionStatusIcon}</span>}
        <Button
          disabled={!!disabled}
          onClick={onClick}
          appearance={'transparent'}
          className={classes.contentButton}
          style={{ paddingRight: !showOutputChevron ? '10px' : '0px' }}
        >
          <span className={classes.cardIcon}>
            <BundledTypeIcon />
          </span>

          <Tooltip
            relationship="label"
            content={<span style={{ overflowWrap: 'break-word' }}>{schemaNode.name}</span>}
            visible={shouldNameTooltipDisplay && isTooltipEnabled}
            onVisibleChange={(_ev, data) => setIsTooltipEnabled(data.visible)}
          >
            <div ref={schemaNameTextRef} className={classes.cardText} style={{ width: `${width - 30}px` }}>
              {schemaNode.name}
            </div>
          </Tooltip>
        </Button>
        {showOutputChevron && (
          <Button
            aria-label={ariaDescribeChevron}
            className={classes.cardChevron}
            onClick={outputChevronOnClick}
            icon={<ChevronIcon filled={isChevronHovered ? true : undefined} />}
            appearance="transparent"
            onMouseEnter={() => setIsChevronHovered(true)}
            onMouseLeave={() => setIsChevronHovered(false)}
          />
        )}
        <CardContextMenu
          title={'remove'}
          contextMenuLocation={contextMenu.location}
          menuItems={disableContextMenu ? [] : [<RemoveMenuItem key="remove" />]}
          open={contextMenu.isShowing}
          setOpen={contextMenu.setIsShowing}
        />
      </div>

      {isNBadgeRequired && isSourceSchemaNode && <NBadge />}
    </div>
  );
};

interface NBadgeProps {
  isOutput?: boolean;
}

const NBadge = ({ isOutput }: NBadgeProps) => {
  const intl = useIntl();
  const classes = useStyles();

  const arrayMappingLabel = intl.formatMessage({
    defaultMessage: 'Repeating',
    description: 'Label for array connection',
  });

  return (
    <div>
      <Tooltip relationship="label" withArrow appearance="inverted" content={arrayMappingLabel}>
        <Badge
          className={isOutput ? classes.outputArrayBadge : classes.inputArrayBadge}
          shape="rounded"
          size="small"
          appearance="tint"
          color="important"
        >
          N
        </Badge>
      </Tooltip>
    </div>
  );
};
