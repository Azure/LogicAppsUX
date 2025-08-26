import { useCallback, useMemo, useState } from 'react';
import { Button } from '@fluentui/react-components';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import { getLogicalCategories } from '@microsoft/designer-ui';
import type { OperationRuntimeCategory } from '@microsoft/logic-apps-shared';
import { CategoryCard } from './categoryCard';
import { Favorites } from './categories/Favorites';
import { useActionSpotlightStyles } from './styles/ActionSpotlight.styles';
import { useIntl } from 'react-intl';
import { useDiscoveryPanelFavoriteOperations } from '../../../core/state/panel/panelSelectors';
export interface ActionSpotlightProps {
  onConnectorSelected: (connectorId: string, origin?: string) => void;
  onOperationSelected: (operationId: string, apiId?: string) => void;
  filters?: Record<string, string>;
}

export const ActionSpotlight = (props: ActionSpotlightProps) => {
  const intl = useIntl();
  const { onConnectorSelected, onOperationSelected } = props;
  const classes = useActionSpotlightStyles();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const favoriteOperationIds = useDiscoveryPanelFavoriteOperations();

  const categories = getLogicalCategories().filter((cat: OperationRuntimeCategory) => cat.key !== 'all');

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

  const aiAgentDescription = intl.formatMessage({
    defaultMessage: 'AI and machine learning capabilities',
    id: 'GR5+k2',
    description: 'AI Agent category description',
  });

  const actionInAppDescription = intl.formatMessage({
    defaultMessage: 'Connect to external services and applications',
    id: 'YqKlGx',
    description: 'Action in an app category description',
  });

  const dataTransformationDescription = intl.formatMessage({
    defaultMessage: 'Transform, parse, and manipulate data',
    id: 'Om9qyd',
    description: 'Data transformation category description',
  });

  const simpleOperationsDescription = intl.formatMessage({
    defaultMessage: 'Basic workflow controls and operations',
    id: 'VWd29W',
    description: 'Simple Operations category description',
  });

  const humanInTheLoopDescription = intl.formatMessage({
    defaultMessage: 'Manual approvals and user interactions',
    id: 'DT+e2k',
    description: 'Human in the loop category description',
  });

  const getCategoryDescription = useCallback(
    (categoryKey: string) => {
      switch (categoryKey) {
        case 'favorites':
          return favoritesDescription;
        case 'aiAgent':
          return aiAgentDescription;
        case 'actionInApp':
          return actionInAppDescription;
        case 'dataTransformation':
          return dataTransformationDescription;
        case 'simpleOperations':
          return simpleOperationsDescription;
        case 'humanInTheLoop':
          return humanInTheLoopDescription;
        default:
          return '';
      }
    },
    [
      favoritesDescription,
      aiAgentDescription,
      actionInAppDescription,
      dataTransformationDescription,
      simpleOperationsDescription,
      humanInTheLoopDescription,
    ]
  );

  // Add favorites as a category if user has favorites
  const allCategories = useMemo(() => {
    const categoryList = [...categories];

    // Add favorites category at the beginning if user has favorites
    if (favoriteOperationIds.length > 0) {
      categoryList.unshift({
        key: 'favorites',
        text: favoritesLabel,
      });
    }

    return categoryList;
  }, [categories, favoriteOperationIds.length, favoritesLabel]);

  const onCategoryClick = useCallback((categoryKey: string) => {
    setSelectedCategory(categoryKey);
  }, []);

  const handleBackToCategories = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  const backToCategoriesText = intl.formatMessage({
    defaultMessage: 'Back to categories',
    id: 'ixQuxT',
    description: 'Back to categories button text',
  });

  // Show category details when a category is selected
  if (selectedCategory) {
    return (
      <div className={classes.container}>
        <Button className={classes.backButton} appearance="subtle" icon={<ArrowLeft24Regular />} onClick={handleBackToCategories}>
          {backToCategoriesText}
        </Button>

        {selectedCategory === 'favorites' && (
          <Favorites onConnectorSelected={onConnectorSelected} onOperationSelected={onOperationSelected} />
        )}
      </div>
    );
  }

  // Show category cards when no category is selected
  return (
    <div className={classes.container}>
      {allCategories.map((category: OperationRuntimeCategory) => (
        <CategoryCard
          key={category.key}
          categoryKey={category.key}
          categoryTitle={category.text}
          categoryDescription={getCategoryDescription(category.key)}
          onCategoryClick={onCategoryClick}
        />
      ))}
    </div>
  );
};
