import type { FunctionData } from '../../../models';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
import {
  Button,
  Caption1,
  tokens,
  Popover,
  PopoverTrigger,
  mergeClasses,
  type OpenPopoverEvents,
  type OnOpenChangeData,
} from '@fluentui/react-components';
import { useCardContextMenu } from '@microsoft/designer-ui';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useStyles } from './styles';
import { getFunctionBrandingForCategory } from '../../../utils/Function.Utils';
import { FunctionConfigurationPopover } from '../../functionConfigurationMenu/functionConfigurationPopover';
import type { RootState } from '../../../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';
import type { StringIndexed } from '@microsoft/logic-apps-shared';
import { setHoverState, setSelectedItem } from '../../../core/state/DataMapSlice';
import { useHoverFunctionNode, useSelectedNode } from '../../../core/state/selectors/selectors';
import { useCallback, useMemo, useState } from 'react';
import { isEmptyConnection, isFunctionInputSlotAvailable } from '../../../utils/Connection.Utils';
import { customTokens } from '../../../core/ThemeConect';

export interface FunctionCardProps extends CardProps {
  functionData: FunctionData;
  dataTestId: string;
}

export interface CardProps {
  onClick?: () => void;
  displayHandle: boolean;
  disabled: boolean;
  id: string;
}

export const FunctionNode = (props: NodeProps<Node<StringIndexed<FunctionCardProps>, 'function'>>) => {
  const { id } = props;
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const { functionData, disabled, dataTestId } = props.data;
  const functionWithConnections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections[id]);
  const isSelected = useSelectedNode(id);
  const isHover = useHoverFunctionNode(id);

  const styles = useStyles();
  const fnBranding = getFunctionBrandingForCategory(functionData.category);
  const contextMenu = useCardContextMenu();

  const funcitonHasInputs = useMemo(() => functionData?.maxNumberOfInputs !== 0, [functionData?.maxNumberOfInputs]);

  const functionInputsFull = useMemo(
    () => !isFunctionInputSlotAvailable(functionWithConnections, functionData?.maxNumberOfInputs),
    [functionData?.maxNumberOfInputs, functionWithConnections]
  );

  const isLeftConnected =
    functionWithConnections?.inputs &&
    functionWithConnections?.inputs.length > 0 &&
    functionWithConnections?.inputs[0] !== undefined &&
    !isEmptyConnection(functionWithConnections?.inputs[0]);
  const isRightConnected = functionWithConnections?.outputs.length > 0;

  const handleOpenChange = useCallback((_e?: OpenPopoverEvents, data?: OnOpenChangeData) => setOpen(data?.open ?? false), []);

  const getHandleStyle = useCallback(
    (_isInput: boolean, isConnected: boolean) => {
      let updatedStyle = styles.handleWrapper;
      if (isConnected) {
        updatedStyle = mergeClasses(updatedStyle, styles.connectedHandle);
      }

      if (isSelected || isHover) {
        updatedStyle = mergeClasses(updatedStyle, styles.selectedHoverHandle);
        if (isConnected) {
          updatedStyle = mergeClasses(updatedStyle, styles.connectedSelectedHoverHandle);
        }
      }

      return updatedStyle;
    },
    [isHover, isSelected, styles.connectedHandle, styles.connectedSelectedHoverHandle, styles.handleWrapper, styles.selectedHoverHandle]
  );

  const onMouseEnter = useCallback(() => {
    dispatch(
      setHoverState({
        id: id,
        type: 'function',
      })
    );
  }, [dispatch, id]);

  const onMouseLeave = useCallback(() => {
    dispatch(setHoverState());
  }, [dispatch]);

  const onClick = useCallback(() => {
    dispatch(setSelectedItem(id));
  }, [dispatch, id]);

  const setActiveNode = useCallback(() => {
    dispatch(setSelectedItem(id));
  }, [dispatch, id]);

  if (functionWithConnections === undefined) {
    return;
  }

  return (
    <div onContextMenu={contextMenu.handle} data-testid={dataTestId} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {funcitonHasInputs && (
        <Handle
          type={'target'}
          isConnectable={!functionInputsFull}
          onConnect={setActiveNode}
          position={Position.Left}
          className={getHandleStyle(true, isLeftConnected)}
          style={{ left: '-7px' }}
        />
      )}
      <Popover open={open} onOpenChange={handleOpenChange} withArrow={true} trapFocus={true}>
        <PopoverTrigger>
          <Button
            onClick={onClick}
            data-selectableid={`source-${id}`}
            disabled={!!disabled}
            className={mergeClasses(styles.functionButton, isSelected || isHover ? styles.selectedHoverFunctionButton : '')}
          >
            <div
              data-selectableid={`source-${id}`}
              className={styles.iconContainer}
              style={{
                backgroundColor: customTokens[fnBranding.colorTokenName],
              }}
            >
              <FunctionIcon
                data-selectableid={`source-${id}`}
                iconSize={11}
                functionKey={functionData.key}
                functionName={functionData.functionName}
                categoryName={functionData.category}
                color={tokens.colorNeutralForegroundInverted}
              />
            </div>
            <Caption1 data-selectableid={`source-${id}`} className={styles.functionName} truncate block>
              {functionData.displayName}
            </Caption1>
          </Button>
        </PopoverTrigger>
        <FunctionConfigurationPopover functionId={props.id} onOpenChange={handleOpenChange} />
      </Popover>
      <Handle type={'source'} position={Position.Right} className={getHandleStyle(false, isRightConnected)} isConnectable={true} />
    </div>
  );
};
