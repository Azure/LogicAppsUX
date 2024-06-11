import { customTokens } from '../../core';
import type { FunctionData } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { FunctionIcon } from '../functionIcon/FunctionIcon';
import { Caption1, TreeItem, TreeItemLayout, tokens } from '@fluentui/react-components';
import { useStyles } from './styles';
import { AddRegular } from '@fluentui/react-icons';

interface FunctionListItemProps {
  functionData: FunctionData;
}

const FunctionListItem = ({ functionData }: FunctionListItemProps) => {
  const styles = useStyles();
  const fnBranding = getFunctionBrandingForCategory(functionData.category);

  return (
    <TreeItem className={styles.functionTreeItem} itemType="leaf">
      <TreeItemLayout className={styles.functionTreeItem} aside={<AddRegular className={styles.addIconAside} />}>
        <div key={functionData.key} className={styles.listButton}>
          <div className={styles.iconContainer} style={{ backgroundColor: customTokens[fnBranding.colorTokenName] }}>
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
    </TreeItem>
  );
};

export default FunctionListItem;
