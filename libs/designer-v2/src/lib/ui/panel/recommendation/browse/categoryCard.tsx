import { Text } from '@fluentui/react-components';
import { ChevronRightRegular } from '@fluentui/react-icons';
import { useCategoryCardStyles } from './styles/CategoryCard.styles';
import { useCallback } from 'react';

export interface CategoryCardProps {
  categoryKey: string;
  categoryTitle: string;
  categoryDescription: string; // Required description prop
  icon: React.ReactNode; // Required icon prop
  isCategory?: boolean; // determines if chevron is shown
  onCategoryClick: (categoryKey: string) => void;
}

export const CategoryCard = ({
  categoryKey,
  categoryTitle,
  categoryDescription,
  icon,
  isCategory = true,
  onCategoryClick,
}: CategoryCardProps) => {
  const classes = useCategoryCardStyles();

  const handleClick = useCallback(() => {
    onCategoryClick(categoryKey);
  }, [categoryKey, onCategoryClick]);

  const displayIcon = icon;

  return (
    <div className={classes.card} onClick={handleClick}>
      <div className={classes.cardContent}>
        <div className={classes.iconContainer}>{displayIcon}</div>
        <div className={classes.textContainer}>
          <Text className={classes.categoryTitle}>{categoryTitle}</Text>
          <Text className={classes.categoryDescription}>{categoryDescription}</Text>
        </div>
        {isCategory && <ChevronRightRegular className={classes.chevron} />}
      </div>
    </div>
  );
};
