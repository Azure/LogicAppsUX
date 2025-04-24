import { AccordionHeader, AccordionItem, AccordionPanel, Link, Text, tokens } from '@fluentui/react-components';
import type { PropsWithChildren } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { BrowseGrid } from '../browseResults';
import { useIntl } from 'react-intl';
import { filterOperationData } from '../helpers';
import { RecommendationPanelConstants } from '../../../constants';
import type { OperationActionData, OperationGroupCardData } from '../interfaces';

export const SpotlightCategoryType = {
  AICapabilities: 'AICapabilities',
  BuiltIns: 'BuiltIns',
  Favorites: 'Favorites',
} as const;
export type SpotlightCategoryType = (typeof SpotlightCategoryType)[keyof typeof SpotlightCategoryType];

export interface SpotlightSectionProps {
  index: SpotlightCategoryType;
  title: string;
  operationsData: (OperationGroupCardData | OperationActionData)[];
  isLoading: boolean;
  isOpen: boolean;
  operationsCountOverride?: number;
  onConnectorSelected: (connectorId: string, origin?: string) => void;
  onOperationSelected: (operationId: string, apiId?: string, origin?: string) => void;
  onSectionBodyRender?: (isExpanded: boolean) => JSX.Element;
  filters?: Record<string, string>;
}

export const SpotlightSection = ({
  operationsData,
  index,
  isLoading,
  isOpen,
  title,
  operationsCountOverride,
  onConnectorSelected,
  onOperationSelected,
  onSectionBodyRender,
  filters,
  children,
}: PropsWithChildren<SpotlightSectionProps>) => {
  const intl = useIntl();

  const [isExpanded, setIsExpanded] = useState(false);

  const onSpotlightSectionConnectorSelected = (connectorId: string) => {
    onConnectorSelected(connectorId, index);
  };

  const onSpotlightSectionOperationSelected = (operationId: string, apiId?: string) => {
    onOperationSelected(operationId, apiId, index);
  };

  const filterOperations = useCallback((data: any) => filterOperationData(data, filters), [filters]);

  const filteredOperationsData = useMemo(() => operationsData.filter(filterOperations), [operationsData, filterOperations]);

  const operationsCount = useMemo(
    () => operationsCountOverride ?? filteredOperationsData.length,
    [operationsCountOverride, filteredOperationsData]
  );

  const seeLessText = intl.formatMessage({
    defaultMessage: 'See less',
    id: 'tqr4hK',
    description: 'See less text for the spotlight section',
  });

  const seeAllText = intl.formatMessage(
    {
      defaultMessage: 'See all {count} actions',
      id: 'khmfg3',
      description: 'See all actions text for the spotlight section',
    },
    { count: operationsCount }
  );

  return (
    <AccordionItem
      value={index}
      className="msla-recommendation-panel-spotlight-section-container"
      style={{ backgroundColor: tokens.colorNeutralBackground2 }}
    >
      <div className="msla-recommendation-panel-spotlight-section-header">
        <AccordionHeader className="msla-recommendation-panel-spotlight-section-header-button">
          <Text weight="semibold" size={300}>
            {title}
          </Text>
        </AccordionHeader>
        {isOpen && operationsCount > RecommendationPanelConstants.ACTION_SPOTLIGHT.MAX_AMOUNT_OF_SPOTLIGHT_ITEMS ? (
          <Link onClick={() => setIsExpanded((v) => !v)} className={'msla-recommendation-panel-spotlight-section-header-link'}>
            {isExpanded ? seeLessText : seeAllText}
          </Link>
        ) : null}
      </div>
      <AccordionPanel>
        {onSectionBodyRender ? (
          onSectionBodyRender(isExpanded)
        ) : (
          <BrowseGrid
            onConnectorSelected={onSpotlightSectionConnectorSelected}
            onOperationSelected={onSpotlightSectionOperationSelected}
            operationsData={
              isExpanded
                ? filteredOperationsData
                : filteredOperationsData.slice(0, RecommendationPanelConstants.ACTION_SPOTLIGHT.MAX_AMOUNT_OF_SPOTLIGHT_ITEMS)
            }
            isLoading={isLoading}
            hideNoResultsText={true}
            displayRuntimeInfo={false}
          />
        )}
        {isExpanded ? children : null}
      </AccordionPanel>
    </AccordionItem>
  );
};
