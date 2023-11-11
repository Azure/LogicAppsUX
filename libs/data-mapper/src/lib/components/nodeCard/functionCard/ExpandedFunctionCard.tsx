import { expandedFunctionCardMaxWidth } from '../../../constants/NodeConstants';
import { customTokens } from '../../../core';
import { deleteCurrentlySelectedItem, setSelectedItem } from '../../../core/state/DataMapSlice';
import type { RootState } from '../../../core/state/Store';
import { generateInputHandleId } from '../../../utils/Connection.Utils';
import { hasOnlyCustomInputType } from '../../../utils/Function.Utils';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { isNodeHighlighted } from '../../../utils/ReactFlow.Util';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
import { errorCardStyles, highlightedCardStyles, selectedCardStyles } from '../NodeCard';
import type { FunctionCardProps } from './FunctionCard';
import { inputsValid, useFunctionCardStyles } from './FunctionCard';
import { Stack, StackItem } from '@fluentui/react';
import { Button, Divider, PresenceBadge, Text, Tooltip, mergeClasses, tokens } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import type { MenuItemOption } from '@microsoft/logic-apps-designer';
import { CardContextMenu, MenuItemType, useCardContextMenu } from '@microsoft/logic-apps-designer';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

export const ExpandedFunctionCard = (props: NodeProps<FunctionCardProps>) => {
  const { functionData, functionBranding, dataTestId } = props.data;
  const reactFlowId = props.id;

  const dispatch = useDispatch();
  const classes = useFunctionCardStyles();

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);
  const selectedItemConnectedNodes = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes
  );
  const sourceNodeConnectionBeingDrawnFromId = useSelector(
    (state: RootState) => state.dataMap.present.sourceNodeConnectionBeingDrawnFromId
  );
  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  const [isExpanded, { toggle: toggleIsExpanded }] = useBoolean(false);

  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);
  const isCurrentNodeHighlighted = useMemo<boolean>(() => {
    return isNodeHighlighted(isCurrentNodeSelected, reactFlowId, selectedItemConnectedNodes);
  }, [isCurrentNodeSelected, reactFlowId, selectedItemConnectedNodes]);

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

  const handleHeaderOnClick = () => {
    // Require a function to already be selected to be able to collapse
    if (!isExpanded || isCurrentNodeSelected) {
      toggleIsExpanded();
    }
  };

  const areCurrentInputsValid = useMemo(() => {
    return inputsValid(reactFlowId, functionData, connections);
  }, [connections, reactFlowId, functionData]);

  const OutputIcon = iconForNormalizedDataType(functionData.outputValueType, 24, false);

  const handlesForCollapsedHeader = functionData.inputs.map((input) => {
    return <Handle key={input.name} id={input.name} type="target" position={Position.Left} style={{ top: '20px', visibility: 'hidden' }} />;
  });

  const header = (
    <Button
      appearance="transparent"
      onClick={handleHeaderOnClick}
      style={{
        padding: '5px',
        minHeight: '20px',
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      {isExpanded ? null : handlesForCollapsedHeader}
      <FunctionIcon
        functionKey={functionData.key}
        functionName={functionData.functionName}
        categoryName={functionData.category}
        color={tokens.colorNeutralForegroundInverted}
      />
      <Text
        style={{
          margin: '0px 12px',
          color: tokens.colorNeutralForegroundInverted,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {functionData.displayName}
      </Text>
      <Divider vertical style={{ height: '100%' }} />
      <OutputIcon style={{ margin: '0px 6px 0px 10px', color: tokens.colorNeutralForegroundInverted }} />
      <Handle
        id={'output'}
        type="source"
        position={Position.Right}
        style={{ top: '20px', visibility: isExpanded ? undefined : 'hidden' }}
      />
    </Button>
  );

  const inputBodyStyles: React.CSSProperties = {
    padding: '0px 10px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
  };
  const handleIndexOffset = 34;
  const handleBaseOffset = 58;

  const inputsForBody = [];
  const curConnection = connections[reactFlowId];
  if (curConnection) {
    if (functionData.maxNumberOfInputs > -1) {
      inputsForBody.push(
        functionData.inputs.map((input, index) => {
          const handleTop = index * handleIndexOffset + handleBaseOffset;
          const curInput = curConnection.inputs[index][0];
          return (
            <StackItem key={input.name}>
              <div key={input.name} style={inputBodyStyles}>
                {!hasOnlyCustomInputType(functionData) && (
                  <Handle
                    id={input.name}
                    type="target"
                    position={Position.Left}
                    style={{
                      top: `${handleTop}px`,
                      backgroundColor:
                        typeof curInput === 'string'
                          ? input
                            ? tokens.colorPaletteBlueBackground2
                            : tokens.colorPaletteRedBackground3
                          : '',
                    }}
                  />
                )}
                {generateInputName(input.name, input.isOptional, input.tooltip)}
              </div>
            </StackItem>
          );
        })
      );
    } else {
      inputsForBody.push(
        curConnection.inputs[0].map((input, index) => {
          const handleTop = index * handleIndexOffset + handleBaseOffset;
          const id = generateInputHandleId(functionData.inputs[0].name, index);
          const name = `${functionData.inputs[0].name} ${index}`;
          const curInput = curConnection.inputs[0][index];
          return (
            <div key={id} style={inputBodyStyles}>
              <Handle
                id={id}
                type="target"
                position={Position.Left}
                style={{
                  top: `${handleTop}px`,
                  backgroundColor:
                    typeof curInput === 'string' ? (input ? tokens.colorPaletteBlueBackground2 : tokens.colorPaletteRedBackground3) : '',
                }}
              />
              {generateInputName(name, functionData.inputs[0].isOptional, functionData.inputs[0].tooltip)}
            </div>
          );
        })
      );
    }
  }

  let divStyle: React.CSSProperties = {
    maxWidth: expandedFunctionCardMaxWidth,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: customTokens[functionBranding.colorTokenName],
  };

  if (isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId) {
    divStyle = { ...selectedCardStyles, ...divStyle };
  } else if (isCurrentNodeHighlighted) {
    divStyle = { ...highlightedCardStyles, ...divStyle };
  } else if (!areCurrentInputsValid) {
    divStyle = { ...errorCardStyles, ...divStyle };
  }

  return (
    <div onContextMenu={contextMenu.handle} className={mergeClasses(classes.container, 'nopan')} data-testid={dataTestId}>
      {!areCurrentInputsValid && (
        <PresenceBadge
          size="extra-small"
          status="busy"
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            zIndex: 1,
          }}
        />
      )}

      <div style={divStyle}>
        <Tooltip
          content={{
            children: <Text size={200}>{functionData.displayName}</Text>,
          }}
          relationship="label"
        >
          {header}
        </Tooltip>
        {isExpanded ? (
          <Stack
            tokens={{
              childrenGap: '4px',
              padding: '6px 4px',
            }}
          >
            {inputsForBody}
          </Stack>
        ) : null}
      </div>

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

const generateInputName = (inputName: string, required: boolean, tooltip?: string) => {
  const inputTextStyles: React.CSSProperties = {
    alignItems: 'center',
    height: '30px',
    display: 'flex',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  };

  const formattedText = `${inputName}${required ? '' : '*'}`;

  return tooltip ? (
    <Tooltip
      content={{
        children: <Text size={200}>{tooltip}</Text>,
      }}
      relationship="label"
    >
      <Text style={inputTextStyles}>{formattedText}</Text>
    </Tooltip>
  ) : (
    <Text style={inputTextStyles}>{formattedText}</Text>
  );
};
