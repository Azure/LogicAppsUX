import { childTargetNodeCardWidth, schemaNodeCardHeight, schemaNodeCardWidth } from '../../constants/NodeConstants';
import { ReactFlowNodeType } from '../../constants/ReactFlowConstants';
import { removeSourceSchemaNodes, setCurrentTargetSchemaNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { SchemaNodeExtended, SourceSchemaNodeExtended } from '../../models';
import { SchemaNodeProperty, SchemaType } from '../../models';
import type { Connection } from '../../models/Connection';
import { isTextUsingEllipsis } from '../../utils/Browser.Utils';
import { flattenInputs, isCustomValue, isValidConnectionByType, isValidCustomValueByType } from '../../utils/Connection.Utils';
import { iconForNormalizedDataType } from '../../utils/Icon.Utils';
import { isSchemaNodeExtended } from '../../utils/Schema.Utils';
import { ItemToggledState } from '../tree/TargetSchemaTreeItem';
import HandleWrapper from './HandleWrapper';
import { getStylesForSharedState, selectedCardStyles } from './NodeCard';
import type { CardProps } from './NodeCard';
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
import {
  bundleIcon,
  ChevronRight16Filled,
  ChevronRight16Regular,
  Important12Filled,
  CheckmarkCircle12Filled,
  CircleHalfFill12Regular,
  Circle12Regular,
} from '@fluentui/react-icons';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { MenuItemType, useCardContextMenu, CardContextMenu } from '@microsoft/designer-ui';
import { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { NodeProps } from 'reactflow';
import { Position } from 'reactflow';

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
  schemaNode: SchemaNodeExtended | SourceSchemaNodeExtended;
  maxWidth?: number;
  schemaType: SchemaType;
  displayHandle: boolean;
  displayChevron: boolean;
  isLeaf: boolean;
  isChild: boolean;
  relatedConnections: Connection[];
  connectionStatus?: ItemToggledState;
}

export const SchemaCard = (props: NodeProps<SchemaCardProps>) => {
  const reactFlowId = props.id;
  const { schemaNode, maxWidth, schemaType, isLeaf, isChild, onClick, disabled, displayHandle, displayChevron, connectionStatus } =
    props.data;
  const dispatch = useDispatch<AppDispatch>();
  const sharedStyles = getStylesForSharedState();
  const classes = useStyles();
  const intl = useIntl();

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

    const curInput = flattenInputs(curConn.inputs)[0];
    if (curInput === undefined) {
      return true;
    }

    if (isCustomValue(curInput)) {
      return isValidCustomValueByType(curInput, schemaNode.normalizedDataType);
    } else {
      if (isSchemaNodeExtended(curInput.node)) {
        return isValidConnectionByType(schemaNode.normalizedDataType, curInput.node.normalizedDataType);
      } else {
        return isValidConnectionByType(schemaNode.normalizedDataType, curInput.node.outputValueType);
      }
    }
  }, [isSourceSchemaNode, connections, reactFlowId, isNodeConnected, schemaNode.normalizedDataType]);

  const outputChevronOnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(setCurrentTargetSchemaNode(schemaNode));
  };

  const ExclamationIcon = bundleIcon(Important12Filled, Important12Filled);
  const ChevronIcon = bundleIcon(ChevronRight16Filled, ChevronRight16Regular);
  const BundledTypeIcon = iconForNormalizedDataType(schemaNode.normalizedDataType, 24, false, schemaNode.nodeProperties);
  const contextMenu = useCardContextMenu();
  const getRemoveMenuItem = (): MenuItemOption => {
    const deleteNode = intl.formatMessage({
      defaultMessage: 'Remove',
      description: 'Remove card from canvas',
    });

    return {
      key: deleteNode,
      disabled: !isSourceSchemaNode,
      iconName: 'Delete',
      title: deleteNode,
      type: MenuItemType.Advanced,
      onClick: handleDeleteClick,
    };
  };

  const handleDeleteClick = () => {
    dispatch(removeSourceSchemaNodes([schemaNode]));
  };

  const selectedNodeStyles = isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId ? selectedCardStyles : undefined;

  const targetCardWidth = isChild ? childTargetNodeCardWidth : schemaNodeCardWidth;
  const cardWidth = isSourceSchemaNode && schemaNode.width ? schemaNode.width : targetCardWidth;
  const maxWidthCalculated = maxWidth || 0;
  const sourceCardMargin = isSourceSchemaNode ? maxWidthCalculated - cardWidth : 0;

  return (
    <div className={classes.badgeContainer} style={{ marginLeft: sourceCardMargin }}>
      {isNBadgeRequired && !isSourceSchemaNode && <NBadge isOutput />}

      <div
        onContextMenu={contextMenu.handle}
        className={containerStyle}
        style={{ ...selectedNodeStyles, width: cardWidth }}
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
            appearance="transparent"
            onMouseEnter={() => setIsChevronHovered(true)}
            onMouseLeave={() => setIsChevronHovered(false)}
          />
        )}
        {
          // danielle maybe show blank menu for target node? Kinda odd that the regular right-click loads
          <CardContextMenu
            title={'remove'}
            contextMenuLocation={contextMenu.location}
            contextMenuOptions={[getRemoveMenuItem()]}
            showContextMenu={contextMenu.isShowing}
            onSetShowContextMenu={contextMenu.setIsShowing}
          />
        }
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
