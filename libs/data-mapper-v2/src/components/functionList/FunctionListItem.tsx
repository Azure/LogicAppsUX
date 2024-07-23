import { customTokens } from '../../core';
import type { FunctionData } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { FunctionIcon } from '../functionIcon/FunctionIcon';
import { Caption1, TreeItem, TreeItemLayout, tokens } from '@fluentui/react-components';
import { useStyles } from './styles';
import { AddRegular } from '@fluentui/react-icons';
import { useDrag } from 'react-dnd';
import { useDispatch } from 'react-redux';
import { addFunctionNode } from '../../core/state/DataMapSlice';
import type { XYPosition } from '@xyflow/react';

interface FunctionListItemProps {
  functionData: FunctionData;
}

export type DropResult = { position: XYPosition } | undefined;

const FunctionListItem = ({ functionData }: FunctionListItemProps) => {
  const styles = useStyles();
  const fnBranding = getFunctionBrandingForCategory(functionData.category);
  const dispatch = useDispatch();

  const [, drag] = useDrag(() => ({
    type: 'function',
    item: functionData.key,
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<DropResult>();
      if (item && dropResult) {
        functionData.position = dropResult.position;
        dispatch(addFunctionNode(functionData));
      }
    },
  }));

  return (
    <TreeItem itemType="leaf">
      <div className={styles.dragWrapper} ref={drag}>
        <TreeItemLayout className={styles.functionTreeItem} aside={<AddRegular className={styles.addIconAside} />}>
          <div key={functionData.key} className={styles.listButton}>
            <div
              className={styles.iconContainer}
              style={{
                backgroundColor: customTokens[fnBranding.colorTokenName],
              }}
            >
              <FunctionIcon
                functionKey={functionData.key}
                functionName={functionData.functionName}
                categoryName={functionData.category}
                color={tokens.colorNeutralForegroundInverted}
                iconSize={11}
              />
            </div>

            <Caption1 truncate block className={styles.functionNameText}>
              {functionData.displayName}
            </Caption1>
            <span style={{ marginLeft: 'auto' }} />
          </div>
        </TreeItemLayout>
      </div>
    </TreeItem>
  );
};

export default FunctionListItem;
