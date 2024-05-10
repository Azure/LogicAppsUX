import type { FunctionCategory } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { makeStyles, shorthands, Text, tokens, Tree, TreeItem, TreeItemLayout, typographyStyles } from '@fluentui/react-components';
import type { FunctionDataTreeItem } from './FunctionList';
import FunctionListItem from './FunctionListItem';

const useStyles = makeStyles({
  header: {
    ...typographyStyles.caption1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    color: tokens.colorNeutralForeground1,
    paddingLeft: tokens.spacingHorizontalXS,
    marginTop: '8px',
    marginBottom: '8px',
  },
});

interface FunctionListHeaderProps {
  category: FunctionCategory;
  functions: FunctionDataTreeItem;
}

const FunctionListHeader = ({ category, functions }: FunctionListHeaderProps) => {
  const styles = useStyles();

  const categoryName = getFunctionBrandingForCategory(category).displayName;

  const functionItems = functions.children.map((func) => {
    return <FunctionListItem key={func.displayName} functionData={func}></FunctionListItem>;
  });

  return (
    <TreeItem itemType="branch">
      <TreeItemLayout>
        <Text className={styles.header}>{categoryName}</Text>{' '}
      </TreeItemLayout>
      <Tree>{functionItems}</Tree>
    </TreeItem>
  );
};

export default FunctionListHeader;
