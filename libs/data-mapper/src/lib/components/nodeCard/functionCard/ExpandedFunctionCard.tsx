import { customTokens } from '../../../core';
import { deleteCurrentlySelectedItem, setSelectedItem } from '../../../core/state/DataMapSlice';
import type { RootState } from '../../../core/state/Store';
import { getIconForFunction, iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { selectedCardStyles } from '../NodeCard';
import type { FunctionCardProps } from './FunctionCard';
import { inputsValid, useFunctionCardStyles } from './FunctionCard';
import { Button, mergeClasses, PresenceBadge, Text, tokens, Tooltip } from '@fluentui/react-components';
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

  const headerForExpanded = (
    <Button
      appearance="subtle"
      onClick={toggleIsExpanded}
      style={{
        padding: '5px',
        minHeight: '20px',
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-start',
        backgroundColor: adjustColor('#ae8c00', -20),
      }}
    >
      {getIconForFunction(functionData.functionName, functionData.category, functionData.iconFileName, functionBranding)}
      {functionData.displayName}
    </Button>
  );

  const handlesForCollapsedHeader = functionData.inputs.map((input) => {
    return <Handle key={input.name} id={input.name} type="target" position={Position.Left} style={{ top: '20px', visibility: 'hidden' }} />;
  });
  const headerForCollapsed = (
    <Button
      appearance="subtle"
      onClick={toggleIsExpanded}
      style={{
        padding: '5px',
        minHeight: '20px',
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-start',
        backgroundColor: adjustColor('#ae8c00', -20),
      }}
    >
      {handlesForCollapsedHeader}
      {getIconForFunction(functionData.functionName, functionData.category, functionData.iconFileName, functionBranding)}
      {functionData.displayName}
      <OutputIcon style={{ marginLeft: '10px' }} />
      <Handle id={'output'} type="source" position={Position.Right} style={{ top: '20px', visibility: 'hidden' }} />
    </Button>
  );

  const inputsForBody = [];
  if (connections[reactFlowId]) {
    if (functionData.maxNumberOfInputs > -1) {
      inputsForBody.push(
        functionData.inputs.map((input, index) => {
          const handleTop = index * 30 + 45;
          return (
            <div key={input.name} style={{ padding: '0px 10px', height: '30px' }}>
              <Handle id={input.name} type="target" position={Position.Left} style={{ top: `${handleTop}px` }} />
              <Tooltip
                content={{
                  children: <Text size={200}>{input.tooltip}</Text>,
                }}
                relationship="label"
              >
                <Text>
                  {input.name}
                  {input.isOptional ? '' : '*'}
                </Text>
              </Tooltip>
            </div>
          );
        })
      );
    } else {
      inputsForBody.push(
        connections[reactFlowId].inputs[0].map((input, index) => {
          const handleTop = index * 30 + 45;
          const id = `${functionData.inputs[0].name}${index}`;
          const name = `${functionData.inputs[0].name} ${index}`;
          return (
            <div key={id} style={{ padding: '0px 10px', height: '30px' }}>
              <Handle
                id={id}
                type="target"
                position={Position.Left}
                style={{
                  top: `${handleTop}px`,
                  backgroundColor:
                    typeof input === 'string' ? (input ? tokens.colorPaletteGreenBackground3 : tokens.colorPaletteRedBackground3) : '',
                }}
              />
              <Tooltip
                content={{
                  children: <Text size={200}>{functionData.inputs[0].tooltip}</Text>,
                }}
                relationship="label"
              >
                <Text>
                  {name}
                  {functionData.inputs[0].isOptional ? '' : '*'}
                </Text>
              </Tooltip>
            </div>
          );
        })
      );
    }
  }

  const bodyForExpanded = (
    <div style={{ display: 'flex' }}>
      <div>{inputsForBody}</div>
      <div style={{ padding: '0px 10px', height: '30px' }}>
        <OutputIcon />
        <Handle type="source" position={Position.Right} style={{ top: '45px' }} />
      </div>
    </div>
  );

  let divStyle = { borderRadius: tokens.borderRadiusMedium, backgroundColor: customTokens[functionBranding.colorTokenName] };

  if (isCurrentNodeSelected || sourceNodeConnectionBeingDrawnFromId === reactFlowId) {
    divStyle = { ...selectedCardStyles, ...divStyle };
  }

  return (
    <div onContextMenu={contextMenu.handle} className={mergeClasses(classes.container, 'nopan')} data-testid={dataTestId}>
      {!areCurrentInputsValid && <PresenceBadge size="extra-small" status="busy" className={classes.errorBadge} />}

      <Tooltip
        content={{
          children: <Text size={200}>{functionData.displayName}</Text>,
        }}
        relationship="label"
      >
        <div style={divStyle}>
          {isExpanded ? headerForExpanded : headerForCollapsed}
          {isExpanded ? bodyForExpanded : null}
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

const adjustColor = (color: string, amount: number) => {
  return (
    '#' +
    color
      .replace(/^#/, '')
      .replace(/../g, (color) => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2))
  );
};
