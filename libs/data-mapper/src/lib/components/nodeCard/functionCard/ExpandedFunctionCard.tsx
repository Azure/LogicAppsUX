import { customTokens } from '../../../core';
import { deleteCurrentlySelectedItem, setSelectedItem } from '../../../core/state/DataMapSlice';
import type { RootState } from '../../../core/state/Store';
import { generateInputHandleId } from '../../../utils/Connection.Utils';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
import { errorCardStyles, selectedCardStyles } from '../NodeCard';
import type { FunctionCardProps } from './FunctionCard';
import { inputsValid, useFunctionCardStyles } from './FunctionCard';
import { Stack, StackItem } from '@fluentui/react';
import { Button, Divider, mergeClasses, PresenceBadge, Text, tokens, Tooltip } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { CardContextMenu, MenuItemType, useCardContextMenu } from '@microsoft/designer-ui';
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

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);
  const sourceNodeConnectionBeingDrawnFromId = useSelector((state: RootState) => state.dataMap.sourceNodeConnectionBeingDrawnFromId);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const [isExpanded, { toggle: toggleIsExpanded }] = useBoolean(false);
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
      onClick={toggleIsExpanded}
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
        color={tokens.colorNeutralForeground1}
      />
      <Text style={{ margin: '0px 12px', color: tokens.colorNeutralForegroundInverted }}>{functionData.displayName}</Text>
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

  const inputBodyStyles = {
    padding: '0px 10px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
  };
  const inputTextStyles = { alignItems: 'center', height: '30px', display: 'flex' };
  const handleIndexOffset = 34;
  const handleBaseOffset = 58;

  const inputsForBody = [];
  if (connections[reactFlowId]) {
    if (functionData.maxNumberOfInputs > -1) {
      inputsForBody.push(
        functionData.inputs.map((input, index) => {
          const handleTop = index * handleIndexOffset + handleBaseOffset;
          return (
            <StackItem key={input.name}>
              <div key={input.name} style={inputBodyStyles}>
                <Handle id={input.name} type="target" position={Position.Left} style={{ top: `${handleTop}px` }} />
                <Tooltip
                  content={{
                    children: <Text size={200}>{input.tooltip}</Text>,
                  }}
                  relationship="label"
                >
                  <Text style={inputTextStyles}>{`${input.name}${input.isOptional ? '' : '*'}`}</Text>
                </Tooltip>
              </div>
            </StackItem>
          );
        })
      );
    } else {
      inputsForBody.push(
        connections[reactFlowId].inputs[0].map((input, index) => {
          const handleTop = index * handleIndexOffset + handleBaseOffset;
          const id = generateInputHandleId(functionData.inputs[0].name, index);
          const name = `${functionData.inputs[0].name} ${index}`;
          return (
            <div key={id} style={inputBodyStyles}>
              <Handle
                id={id}
                type="target"
                position={Position.Left}
                style={{
                  top: `${handleTop}px`,
                  backgroundColor:
                    typeof input === 'string' ? (input ? tokens.colorPaletteBlueBackground2 : tokens.colorPaletteRedBackground3) : '',
                }}
              />
              <Tooltip
                content={{
                  children: <Text size={200}>{functionData.inputs[0].tooltip}</Text>,
                }}
                relationship="label"
              >
                <Text style={inputTextStyles}>{`${name}${functionData.inputs[0].isOptional ? '' : '*'}`}</Text>
              </Tooltip>
            </div>
          );
        })
      );
    }
  }

  let divStyle = {
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: customTokens[functionBranding.colorTokenName],
  };

  if (isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId) {
    divStyle = { ...selectedCardStyles, ...divStyle };
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
      <Tooltip
        content={{
          children: <Text size={200}>{functionData.displayName}</Text>,
        }}
        relationship="label"
      >
        <div style={divStyle}>
          {header}
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
      </Tooltip>
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
