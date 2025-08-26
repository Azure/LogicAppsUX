import { Text } from '@fluentui/react-components';
import {
  ChevronRightRegular,
  BotSparkle24Regular,
  Apps24Regular,
  Flow24Regular,
  Settings24Regular,
  People24Regular,
  Star24Filled,
} from '@fluentui/react-icons';
import { useCategoryCardStyles } from './styles/CategoryCard.styles';
import { useCallback } from 'react';

export interface CategoryCardProps {
  categoryKey: string;
  categoryTitle: string;
  categoryDescription?: string;
  onCategoryClick: (categoryKey: string) => void;
}

const getCategoryIcon = (categoryKey: string, iconClassName: string) => {
  switch (categoryKey) {
    case 'favorites':
      return <Star24Filled className={iconClassName} />;
    case 'aiAgent':
      return <BotSparkle24Regular className={iconClassName} />;
    case 'actionInApp':
      return <Apps24Regular className={iconClassName} />;
    case 'dataTransformation':
      return <Flow24Regular className={iconClassName} />;
    case 'simpleOperations':
      return <Settings24Regular className={iconClassName} />;
    case 'humanInTheLoop':
      return <People24Regular className={iconClassName} />;
    default:
      return <Settings24Regular className={iconClassName} />;
  }
};

export const CategoryCard = ({ categoryKey, categoryTitle, categoryDescription, onCategoryClick }: CategoryCardProps) => {
  const classes = useCategoryCardStyles();

  const handleClick = useCallback(() => {
    onCategoryClick(categoryKey);
  }, [categoryKey, onCategoryClick]);

  return (
    <div className={classes.card} onClick={handleClick}>
      <div className={classes.cardContent}>
        <div className={classes.iconContainer}>{getCategoryIcon(categoryKey, classes.icon)}</div>
        <div className={classes.textContainer}>
          <Text className={classes.categoryTitle}>{categoryTitle}</Text>
          {categoryDescription && <Text className={classes.categoryDescription}>{categoryDescription}</Text>}
        </div>
        <ChevronRightRegular className={classes.chevron} />
      </div>
    </div>
  );
};
