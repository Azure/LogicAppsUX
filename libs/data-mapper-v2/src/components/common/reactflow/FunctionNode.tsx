import { customTokens } from '../../../core';
import type { FunctionData } from '../../../models';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
import { Button, Caption1, tokens, Popover, PopoverTrigger, mergeClasses } from '@fluentui/react-components';
import { useCardContextMenu } from '@microsoft/designer-ui';

import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useStyles } from './styles';
import { getFunctionBrandingForCategory } from '../../../utils/Function.Utils';
import { FunctionConfigurationPopover } from '../../functionConfigurationMenu/functionConfigurationPopover';
import type { RootState } from '../../../core/state/Store';
import { useSelector } from 'react-redux';
import type { StringIndexed } from '@microsoft/logic-apps-shared';

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
  const { functionData, disabled, dataTestId } = props.data;
  const functionWithConnections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections[props.id]);

  const styles = useStyles();
  const fnBranding = getFunctionBrandingForCategory(functionData.category);
  const contextMenu = useCardContextMenu();

  if (!functionWithConnections) {
    return;
  }

  const isLeftConnected = functionWithConnections.inputs[0] && functionWithConnections.inputs[0].length > 0;
  const isRightConnected = functionWithConnections.outputs.length > 0;

  const funcitonHasInputs = functionData.maxNumberOfInputs !== 0;

  return (
    <div onContextMenu={contextMenu.handle} data-testid={dataTestId}>
      {funcitonHasInputs && (
        <Handle
          type={'target'}
          position={Position.Left}
          className={mergeClasses(styles.handleWrapper, isLeftConnected ? styles.handleConnected : '')}
          style={{ left: '-7px' }}
        />
      )}
      <Popover>
        <PopoverTrigger>
          <Button disabled={!!disabled} className={styles.functionButton}>
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
      <Handle
        type={'source'}
        position={Position.Right}
        className={mergeClasses(styles.handleWrapper, isRightConnected ? styles.handleConnected : '')}
      />
    </div>
  );
};
