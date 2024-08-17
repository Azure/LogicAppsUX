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
import { setSelectedItem } from '../../../core/state/DataMapSlice';
import { useActiveNode } from '../../../core/state/selectors/selectors';
import { useMemo, useState } from 'react';
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
  const dispatch = useDispatch();
  const { functionData, disabled, dataTestId } = props.data;
  const functionWithConnections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections[props.id]);
  const activeNode = useActiveNode(props.id);
  const [isHandleHovered, setIsHandleHovered] = useState<boolean>(false);

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

  const styleForLeftHandle = useMemo(() => {
    let style = styles.handleWrapper;
    if (activeNode !== undefined) {
      style = mergeClasses(style, styles.activeHandle);
    } else if (isLeftConnected) {
      style = mergeClasses(style, styles.handleConnected);
    }
    if (functionInputsFull && isHandleHovered) {
      style = mergeClasses(style, styles.fullNode);
    }
    return style;
  }, [activeNode, styles, isLeftConnected, functionInputsFull, isHandleHovered]);

  const styleForRightHandle = useMemo(() => {
    let style = styles.handleWrapper;

    if (activeNode !== undefined) {
      style = mergeClasses(style, styles.activeHandle);
    } else if (isRightConnected) {
      style = mergeClasses(style, styles.handleConnected);
    }
    return style;
  }, [activeNode, styles, isRightConnected]);

  const leftHandleStyle = styleForLeftHandle;
  const rightHandleStyle = styleForRightHandle;

  const onClick = () => {
    dispatch(setSelectedItem(props.id));
  };

  const setActiveNode = () => {
    dispatch(setSelectedItem(props.id));
  };

  if (functionWithConnections === undefined) {
    return;
  }

  return (
    <div
      onContextMenu={contextMenu.handle}
      data-testid={dataTestId}
      onMouseEnter={() => setIsHandleHovered(true)}
      onMouseLeave={() => setIsHandleHovered(false)}
    >
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
            className={mergeClasses(styles.functionButton, activeNode ? styles.activeFunctionButton : '')}
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
