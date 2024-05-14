import type { FunctionCategory } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { makeStyles, shorthands, Text, tokens, Tree, TreeItem, TreeItemLayout, typographyStyles } from '@fluentui/react-components';
import type { FunctionDataTreeItem } from './FunctionList';
import FunctionListItem from './FunctionListItem';

const useStyles = makeStyles({
  headerText: {
    ...typographyStyles.caption1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    paddingLeft: tokens.spacingHorizontalXS,
    fontSize: '13px',
    marginTop: '8px',
    marginBottom: '8px',
  },
  headerCell: {},
});

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
    <TreeItem key={category} value={category} className={styles.headerCell} itemType="branch">
      <TreeItemLayout className={styles.headerCell}>
        <Text className={styles.headerText}>{categoryName}</Text>
      </TreeItemLayout>
      <Tree>{functionItems}</Tree>
    </TreeItem>
  );
};

export default FunctionListHeader;
