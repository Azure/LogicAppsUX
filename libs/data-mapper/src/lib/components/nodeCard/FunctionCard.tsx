import type { FunctionGroupBranding } from '../../constants/FunctionConstants';
import { functionNodeCardSize } from '../../constants/NodeConstants';
import { ReactFlowNodeType } from '../../constants/ReactFlowConstants';
import { customTokens } from '../../core';
import { deleteCurrentlySelectedItem, setSelectedItem } from '../../core/state/DataMapSlice';
import type { RootState } from '../../core/state/Store';
import type { FunctionInput } from '../../models/Function';
import { isCustomValue, isValidConnectionByType, isValidCustomValueByType } from '../../utils/Connection.Utils';
import { getIconForFunction } from '../../utils/Icon.Utils';
import { isSchemaNodeExtended } from '../../utils/Schema.Utils';
import HandleWrapper from './HandleWrapper';
import type { CardProps } from './NodeCard';
import { getStylesForSharedState, selectedCardStyles } from './NodeCard';
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
import type { MenuItemOption } from '@microsoft/designer-ui';
import { CardContextMenu, MenuItemType, useCardContextMenu } from '@microsoft/designer-ui';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { NodeProps } from 'reactflow';
import { Position } from 'reactflow';

const sharedHalfCardSize = functionNodeCardSize / 2;

const useStyles = makeStyles({
  root: {
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    color: tokens.colorNeutralBackground1,
    fontSize: '20px',
    height: `${sharedHalfCardSize}px`,
    width: `${sharedHalfCardSize}px`,
    minWidth: `${sharedHalfCardSize}px`,
    textAlign: 'center',
    position: 'relative',
    justifyContent: 'center',
    ...shorthands.padding('0px'),
    ...shorthands.margin(tokens.strokeWidthThick),
    '&:hover': {
      color: tokens.colorNeutralBackground1,
    },
    '&:active': {
      // Not sure what was overwriting the base color, but the important overwrites the overwrite
      color: `${tokens.colorNeutralBackground1} !important`,
    },
  },
  errorBadge: {
    position: 'absolute',
    top: '1px',
    right: '-2px',
    zIndex: '1',
  },
  container: {
    position: 'relative',
  },
  focusIndicator: createFocusOutlineStyle({
    selector: 'focus-within',
    style: {
      outlineRadius: '100px',
    },
  }),
});

export interface FunctionCardProps extends CardProps {
  displayName: string;
  functionName: string;
  maxNumberOfInputs: number;
  inputs: FunctionInput[];
  iconFileName?: string;
  functionBranding: FunctionGroupBranding;
  dataTestId: string;
}

export const FunctionCard = (props: NodeProps<FunctionCardProps>) => {
  const dispatch = useDispatch();
  const reactFlowId = props.id;
  const {
    displayName,
    functionName,
    inputs: fnInputs,
    maxNumberOfInputs,
    disabled,
    functionBranding,
    displayHandle,
    onClick,
    dataTestId,
  } = props.data; // iconFileName
  const classes = useStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);
  const sourceNodeConnectionBeingDrawnFromId = useSelector((state: RootState) => state.dataMap.sourceNodeConnectionBeingDrawnFromId);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);

  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);

  const intl = useIntl();
  const contextMenu = useCardContextMenu();
  const getDeleteMenuItem = (): MenuItemOption => {
    const deleteDescription = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Delete text',
    });

    return {
      key: deleteDescription,
      disabled: false,
      iconName: 'Delete',
      title: deleteDescription,
      type: MenuItemType.Advanced,
      onClick: handleDeleteClick,
    };
  };

  const handleDeleteClick = () => {
    dispatch(setSelectedItem(reactFlowId));
    dispatch(deleteCurrentlySelectedItem());
  };

  const shouldDisplayHandles = !sourceNodeConnectionBeingDrawnFromId && (isCardHovered || isCurrentNodeSelected);
  const shouldDisplayTargetHandle =
    displayHandle &&
    maxNumberOfInputs !== 0 &&
    !!sourceNodeConnectionBeingDrawnFromId &&
    sourceNodeConnectionBeingDrawnFromId !== reactFlowId;
  const shouldDisplaySourceHandle = displayHandle && shouldDisplayHandles;

  const areCurrentInputsValid = useMemo(() => {
    let isEveryInputValid = true;
    const curConn = connections[reactFlowId];

    if (curConn) {
      Object.values(curConn.inputs).forEach((inputArr, inputIdx) => {
        inputArr.forEach((inputVal) => {
          let inputValMatchedOneOfAllowedTypes = false;

          fnInputs[inputIdx].allowedTypes.forEach((allowedInputType) => {
            if (inputVal !== undefined) {
              if (isCustomValue(inputVal)) {
                if (isValidCustomValueByType(inputVal, allowedInputType)) {
                  inputValMatchedOneOfAllowedTypes = true;
                }
              } else {
                if (isSchemaNodeExtended(inputVal.node)) {
                  if (isValidConnectionByType(allowedInputType, inputVal.node.normalizedDataType)) {
                    inputValMatchedOneOfAllowedTypes = true;
                  }
                } else if (isValidConnectionByType(allowedInputType, inputVal.node.outputValueType)) {
                  inputValMatchedOneOfAllowedTypes = true;
                }
              }
            }
          });

          if (!inputValMatchedOneOfAllowedTypes) {
            isEveryInputValid = false;
          }
        });
      });
    }

    return isEveryInputValid;
  }, [connections, reactFlowId, fnInputs]);

  return (
    <div
      onContextMenu={contextMenu.handle}
      className={mergeClasses(classes.container, 'nopan')}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      data-testid={dataTestId}
    >
      <HandleWrapper
        type="target"
        position={Position.Left}
        shouldDisplay={shouldDisplayTargetHandle}
        nodeReactFlowType={ReactFlowNodeType.FunctionNode}
        nodeReactFlowId={reactFlowId}
      />

      {!areCurrentInputsValid && <PresenceBadge size="extra-small" status="busy" className={classes.errorBadge} />}

      <Tooltip
        content={{
          children: <Text size={200}>{displayName}</Text>,
        }}
        relationship="label"
      >
        <Button
          onClick={onClick}
          className={mergedClasses}
          style={
            isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId
              ? { ...selectedCardStyles, backgroundColor: customTokens[functionBranding.colorTokenName] }
              : { backgroundColor: customTokens[functionBranding.colorTokenName] }
          }
          disabled={!!disabled}
        >
          {getIconForFunction(functionName, undefined, functionBranding) /* TODO: undefined -> iconFileName once all SVGs in */}
        </Button>
      </Tooltip>

      <HandleWrapper
        type="source"
        position={Position.Right}
        shouldDisplay={shouldDisplaySourceHandle}
        nodeReactFlowType={ReactFlowNodeType.FunctionNode}
        nodeReactFlowId={reactFlowId}
      />
      <CardContextMenu
        title={'Delete'}
        contextMenuLocation={contextMenu.location}
        contextMenuOptions={[getDeleteMenuItem()]}
        showContextMenu={contextMenu.isShowing}
        onSetShowContextMenu={contextMenu.setIsShowing}
      />
    </div>
  );
};
