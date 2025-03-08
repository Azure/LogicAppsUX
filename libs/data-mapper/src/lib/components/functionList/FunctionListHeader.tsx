import type { FunctionCategory } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';

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
}

const FunctionListHeader = ({ category }: FunctionListHeaderProps) => {
  const styles = useStyles();

  const categoryName = getFunctionBrandingForCategory(category).displayName;

  return <Text className={styles.header}>{categoryName}</Text>;
};

export default FunctionListHeader;
