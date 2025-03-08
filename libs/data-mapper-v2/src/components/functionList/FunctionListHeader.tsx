import type { FunctionCategory } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { Text, Tree, TreeItem, TreeItemLayout } from '@fluentui/react-components';
import type { FunctionDataTreeItem } from './FunctionList';
import FunctionListItem from './FunctionListItem';
import { useStyles } from './styles';

interface FunctionListHeaderProps {
  category: FunctionCategory;
  functions: FunctionDataTreeItem;
}

const FunctionListHeader = ({ category, functions }: FunctionListHeaderProps) => {
  const styles = useStyles();

  const categoryName = getFunctionBrandingForCategory(category).displayName;

  const functionItems = functions.children.map((func) => {
    return <FunctionListItem key={func.displayName} functionData={func} />;
  });

  return (
    <TreeItem key={category} value={category} itemType="branch" className={styles.headerRoot}>
      <TreeItemLayout>
        <Text className={styles.headerText}>{categoryName}</Text>
      </TreeItemLayout>
      <Tree>{functionItems}</Tree>
    </TreeItem>
  );
};

export default FunctionListHeader;
