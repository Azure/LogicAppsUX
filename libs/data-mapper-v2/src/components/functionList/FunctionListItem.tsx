import { customTokens } from '../../core';
import type { FunctionData } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { FunctionIcon } from '../functionIcon/FunctionIcon';
import { Button, Caption1, TreeItem, TreeItemLayout, tokens } from '@fluentui/react-components';
import { useStyles } from './styles';

interface FunctionListItemProps {
  functionData: FunctionData;
}

const FunctionListItem = ({ functionData }: FunctionListItemProps) => {
  const styles = useStyles();
  const fnBranding = getFunctionBrandingForCategory(functionData.category);

  return (
    <TreeItem className={styles.functionTreeItem} itemType="leaf">
      <TreeItemLayout className={styles.functionTreeItem}>
        <Button key={functionData.key} alt-text={functionData.displayName} className={styles.listButton}>
          <div className={styles.iconContainer} style={{ backgroundColor: customTokens[fnBranding.colorTokenName] }}>
            <FunctionIcon
              functionKey={functionData.key}
              functionName={functionData.functionName}
              categoryName={functionData.category}
              color={tokens.colorNeutralForegroundInverted}
              iconSize={10}
            />
          </div>

          <Caption1 truncate block className={styles.functionNameText}>
            {functionData.displayName}
          </Caption1>

          <span style={{ marginLeft: 'auto' }} />
        </Button>
      </TreeItemLayout>
    </TreeItem>
  );
};

export default FunctionListItem;
