import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Star24Filled } from '@fluentui/react-icons';
import { getActionCategories, type EnhancedOperationRuntimeCategory } from '@microsoft/designer-ui';
import { CategoryCard } from './categoryCard';
import { Favorites } from './categories/Favorites';
import { useActionBrowseStyles } from './styles/ActionBrowse.styles';
import { useIntl } from 'react-intl';
import { useDiscoveryPanelFavoriteOperations, useDiscoveryPanelSelectedBrowseCategory } from '../../../core/state/panel/panelSelectors';
import { selectBrowseCategory } from '../../../core/state/panel/panelSlice';
import type { AppDispatch } from '../../../core';

export interface ActionBrowseProps {
  onConnectorSelected: (connectorId: string, origin?: string) => void;
  onOperationSelected: (operationId: string, apiId?: string) => void;
}

export const ActionBrowse = ({ onConnectorSelected, onOperationSelected }: ActionBrowseProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const classes = useActionBrowseStyles();
  const selectedBrowseCategory = useDiscoveryPanelSelectedBrowseCategory();
  const favoriteOperationIds = useDiscoveryPanelFavoriteOperations();
  const categories = getActionCategories();

  const favoritesLabel = intl.formatMessage({
    defaultMessage: 'Favorites',
    id: 'h4r8HJ',
    description: 'Favorites label',
  });

  const favoritesDescription = intl.formatMessage({
    defaultMessage: 'Your starred actions and connectors',
    id: 'YbOYXS',
    description: 'Favorites category description',
  });

  // Add favorites as a category if user has favorites
  const allCategories = useMemo(() => {
    const categoryList: EnhancedOperationRuntimeCategory[] = [...categories];

    // Add favorites category at the beginning if user has favorites
    if (favoriteOperationIds.length > 0) {
      categoryList.unshift({
        key: 'favorites',
        text: favoritesLabel,
        description: favoritesDescription,
        icon: <Star24Filled />,
      });
    }

    return categoryList;
  }, [categories, favoriteOperationIds.length, favoritesLabel, favoritesDescription]);

  const onCategoryClick = useCallback(
    (categoryKey: string) => {
      const category = allCategories.find((cat) => cat.key === categoryKey);
      // Update Redux state for category selection
      dispatch(selectBrowseCategory({ key: categoryKey, title: category?.text || categoryKey }));
    },
    [allCategories, dispatch]
  );

  // Show category details when a category is selected
  if (selectedBrowseCategory) {
    if (selectedBrowseCategory.key === 'favorites') {
      return <Favorites onConnectorSelected={onConnectorSelected} onOperationSelected={onOperationSelected} />;
    }

    // Handle other categories here if needed
    return null;
  }

  // Show category cards when no category is selected
  return (
    <div className={classes.container}>
      {allCategories.map((category: EnhancedOperationRuntimeCategory) => (
        <CategoryCard
          key={category.key}
          categoryKey={category.key}
          categoryTitle={category.text}
          categoryDescription={category.description}
          icon={category.icon}
          onCategoryClick={onCategoryClick}
        />
      ))}
    </div>
  );
};
