import type { FunctionCategory } from '../../models/Function';
import { makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  header: {
    ...typographyStyles.caption1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    color: tokens.colorNeutralForeground1,
    paddingLeft: tokens.spacingHorizontalXS,
  },
});

interface FunctionListHeaderProps {
  category: FunctionCategory;
}

const FunctionListHeader = ({ category }: FunctionListHeaderProps) => {
  const styles = useStyles();

  return <Text className={styles.header}>{category}</Text>;
};

export default FunctionListHeader;
