import type { FunctionGroupBranding } from '../../constants/FunctionConstants';
import { functionNodeCardSize } from '../../constants/NodeConstants';
import { customTokens } from '../../core';
import { deleteCurrentlySelectedItem, setSelectedItem } from '../../core/state/DataMapSlice';
import type { RootState } from '../../core/state/Store';
import type { FunctionData } from '../../models/Function';
import { isCustomValue, isValidConnectionByType, isValidCustomValueByType } from '../../utils/Connection.Utils';
import { getIconForFunction, iconForNormalizedDataType } from '../../utils/Icon.Utils';
import { isSchemaNodeExtended } from '../../utils/Schema.Utils';
import type { CardProps } from './NodeCard';
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
import { useBoolean } from '@fluentui/react-hooks';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { CardContextMenu, MenuItemType, useCardContextMenu } from '@microsoft/designer-ui';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

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

export interface AdvancedFunctionCardProps extends CardProps {
  functionData: FunctionData;
  functionBranding: FunctionGroupBranding;
  dataTestId: string;
}

export const AdvancedFunctionCard = (props: NodeProps<AdvancedFunctionCardProps>) => {
  const dispatch = useDispatch();
  const reactFlowId = props.id;
  const { functionData, functionBranding, dataTestId } = props.data;
  const classes = useStyles();
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

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
    let isEveryInputValid = true;
    const curConn = connections[reactFlowId];

    if (curConn) {
      Object.values(curConn.inputs).forEach((inputArr, inputIdx) => {
        inputArr.forEach((inputVal) => {
          let inputValMatchedOneOfAllowedTypes = false;

          functionData.inputs[inputIdx].allowedTypes.forEach((allowedInputType) => {
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
  }, [connections, reactFlowId, functionData.inputs]);

  //#region Content

  const [isExpanded, { toggle: toggleIsExpanded }] = useBoolean(false);
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
              {input.name}
              {input.isOptional ? '' : '*'}
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
              {name}
              {functionData.inputs[0].isOptional ? '' : '*'}
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

  //#endregion

  return (
    <div onContextMenu={contextMenu.handle} className={mergeClasses(classes.container, 'nopan')} data-testid={dataTestId}>
      {!areCurrentInputsValid && <PresenceBadge size="extra-small" status="busy" className={classes.errorBadge} />}

      <Tooltip
        content={{
          children: <Text size={200}>{functionData.displayName}</Text>,
        }}
        relationship="label"
      >
        <div style={{ borderRadius: '20px', backgroundColor: customTokens[functionBranding.colorTokenName] }}>
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
