import { customTokens } from '../../../core';
import type { FunctionData } from '../../../models';
import { FunctionIcon } from '../../functionIcon/FunctionIcon';
import { Button, Caption1, tokens, Popover, PopoverTrigger } from '@fluentui/react-components';
import { useCardContextMenu } from '@microsoft/designer-ui';

import { Handle, Position, type NodeProps } from 'reactflow';
import { useStyles } from './styles';
import { getFunctionBrandingForCategory } from '../../../utils/Function.Utils';
import { FunctionConfigurationPopover } from '../../functionConfigurationMenu/functionConfigurationPopover';

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

export const FunctionNode = (props: NodeProps<FunctionCardProps>) => {
  const { functionData, disabled, dataTestId } = props.data;
  const styles = useStyles();
  const fnBranding = getFunctionBrandingForCategory(functionData.category);

  const contextMenu = useCardContextMenu();

  return (
    <div onContextMenu={contextMenu.handle} data-testid={dataTestId}>
      <Handle
        type={'target'}
        position={Position.Left}
        className={styles.handleWrapper} //{mergeClasses(styles.handleWrapper, isConnected ? styles.handleConnected : '')}
        style={{ left: '-7px' }}
      />
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
        className={styles.handleWrapper} //{mergeClasses(styles.handleWrapper, isConnected ? styles.handleConnected : '')}
      />
    </div>
  );
};
