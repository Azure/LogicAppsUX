import type { FunctionData } from '../../../models';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
import { Button, Caption1, tokens, Popover, PopoverTrigger, mergeClasses } from '@fluentui/react-components';
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
import { useCallback, useMemo } from 'react';
import { isFunctionInputSlotAvailable } from '../../../utils/Connection.Utils';
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
  const { functionData, disabled, dataTestId } = props.data;
  const functionWithConnections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections[id]);
  const isSelected = useSelectedNode(id);
  const isHover = useHoverFunctionNode(id);

  const styles = useStyles();
  const fnBranding = getFunctionBrandingForCategory(functionData.category);
  const contextMenu = useCardContextMenu();

  const funcitonHasInputs = functionData?.maxNumberOfInputs !== 0;

  const functionInputsFull = !isFunctionInputSlotAvailable(functionWithConnections, functionData?.maxNumberOfInputs);

  const isLeftConnected =
    functionWithConnections?.inputs[0] &&
    functionWithConnections?.inputs[0].length > 0 &&
    functionWithConnections?.inputs[0][0] !== undefined;
  const isRightConnected = functionWithConnections?.outputs.length > 0;

  const leftHandleStyle = useMemo(() => {
    let updatedStyle = styles.handleWrapper;
    if (isLeftConnected) {
      updatedStyle = mergeClasses(updatedStyle, styles.connectedHandle);
    }

    if (isSelected || isHover) {
      updatedStyle = mergeClasses(updatedStyle, styles.selectedHoverHandle);
      if (isLeftConnected) {
        updatedStyle = mergeClasses(updatedStyle, styles.connectedSelectedHoverHandle);
      }
    }

    if (functionInputsFull && isHover) {
      updatedStyle = mergeClasses(updatedStyle, styles.fullNode);
    }

    return updatedStyle;
  }, [isHover, isSelected, styles, isLeftConnected, functionInputsFull]);

  const rightHandleStyle = useMemo(() => {
    let updatedStyle = styles.handleWrapper;
    if (isRightConnected) {
      updatedStyle = mergeClasses(updatedStyle, styles.connectedHandle);
    }

    if (isSelected || isHover) {
      updatedStyle = mergeClasses(updatedStyle, styles.selectedHoverHandle);
      if (isRightConnected) {
        updatedStyle = mergeClasses(updatedStyle, styles.connectedSelectedHoverHandle);
      }
    }

    return updatedStyle;
  }, [
    styles.handleWrapper,
    styles.connectedHandle,
    styles.selectedHoverHandle,
    styles.connectedSelectedHoverHandle,
    isRightConnected,
    isSelected,
    isHover,
  ]);

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
          className={leftHandleStyle}
          style={{ left: '-7px' }}
        />
      )}
      <Popover>
        <PopoverTrigger>
          <Button
            onClick={() => onClick()}
            disabled={!!disabled}
            className={mergeClasses(styles.functionButton, isSelected || isHover ? styles.selectedHoverFunctionButton : '')}
          >
            <div
              className={styles.iconContainer}
              style={{
                backgroundColor: customTokens[fnBranding.colorTokenName],
              }}
            >
              <FunctionIcon
                iconSize={11}
                functionKey={functionData.key}
                functionName={functionData.functionName}
                categoryName={functionData.category}
                color={tokens.colorNeutralForegroundInverted}
              />
            </div>
            <Caption1 className={styles.functionName} truncate block>
              {functionData.displayName}
            </Caption1>
          </Button>
        </PopoverTrigger>
        <FunctionConfigurationPopover functionId={props.id} />
      </Popover>
      <Handle type={'source'} position={Position.Right} className={rightHandleStyle} />
    </div>
  );
};
