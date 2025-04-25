import { Text, ToggleButton, Tooltip } from '@fluentui/react-components';
import { GridFilled, GridRegular, TextSortAscendingRegular, TextSortDescendingRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { getRecordEntry, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import type { SearchResultSortOption } from '../../../';
import { SearchResultSortOptions } from '../../../';
import { InteractionTagList } from './interactionTagList';
import { getDefaultRuntimeCategories } from '../helpers';

interface RuntimeFilterTagListProperties {
  filters: Record<string, string>;
  setFilters: (filters: Record<string, string>) => void;
  isSearchResult?: boolean;
  groupedByConnector?: boolean;
  setGroupedByConnector?: (newValue: boolean) => void;
  resultsSorting?: SearchResultSortOption;
  setResultsSorting?: (newValue: SearchResultSortOption) => void;
}

export const RuntimeFilterTagList = ({
  filters,
  groupedByConnector,
  isSearchResult,
  resultsSorting,
  setFilters,
  setResultsSorting,
  setGroupedByConnector,
}: RuntimeFilterTagListProperties) => {
  const intl = useIntl();

  const runtimeFilters = getDefaultRuntimeCategories().map((category) => ({
    key: `runtime-${category.key}`,
    text: category.text,
    value: category.key,
  }));

  const onTabSelect = (tabValue: string | undefined, filterProperty: string) => {
    if (tabValue) {
      const newFilters = { ...filters, [filterProperty]: tabValue };
      setFilters?.(newFilters);
      LoggerService().log({
        area: 'RuntimeFilterTagList:onTabSelect',
        args: [newFilters],
        level: LogEntryLevel.Verbose,
        message: 'Tab selected in Runtime Filter Tag List.',
      });
    }
  };

  const handleGroupByConnectorClick = () => setGroupedByConnector?.(!groupedByConnector);

  const handleSortClick = () => {
    if (setResultsSorting) {
      setResultsSorting(
        resultsSorting === SearchResultSortOptions.unsorted || resultsSorting === SearchResultSortOptions.descending
          ? SearchResultSortOptions.ascending
          : SearchResultSortOptions.descending
      );
    }
  };

  const sortResultsTooltipText = intl.formatMessage({
    defaultMessage: 'Sort results',
    id: 'zujc0T',
    description: 'Tooltip text for sorting results',
  });

  const groupByConnectorTooltipText = groupedByConnector
    ? intl.formatMessage({
        defaultMessage: 'Ungroup actions',
        id: 'J57qJc',
        description: 'Tooltip label for the button that allows user to ungroup search results to a single list.',
      })
    : intl.formatMessage({
        defaultMessage: 'Group actions by connector',
        id: 'e8JCcn',
        description: 'Tooltip label for the button that allows user to group search results by connector.',
      });

  const ByConnectorLabel = intl.formatMessage({
    defaultMessage: 'By Connector',
    id: 'DN+7zV',
    description: 'Label for the checkbox to group results by connector',
  });

  return (
    <>
      {isSearchResult ? null : <Text className="msla-runtime-filter-tag-list-heading">{ByConnectorLabel}</Text>}
      <div className="msla-runtime-filter-tag-list-interaction-tag-list">
        <InteractionTagList
          items={runtimeFilters}
          initialSelectedItem={getRecordEntry(filters, 'runtime')}
          onTagSelect={(value) => onTabSelect(value, 'runtime')}
        />
        {isSearchResult ? (
          <div className="msla-runtime-filter-tag-list-buttons-container">
            <Tooltip content={sortResultsTooltipText} relationship="label">
              <ToggleButton
                appearance="subtle"
                icon={resultsSorting === SearchResultSortOptions.descending ? <TextSortDescendingRegular /> : <TextSortAscendingRegular />}
                onClick={handleSortClick}
                checked={resultsSorting !== SearchResultSortOptions.unsorted}
              />
            </Tooltip>
            <Tooltip content={groupByConnectorTooltipText} relationship="label">
              <ToggleButton
                appearance="subtle"
                icon={groupedByConnector ? <GridFilled /> : <GridRegular />}
                checked={groupedByConnector}
                onClick={handleGroupByConnectorClick}
              />
            </Tooltip>
          </div>
        ) : null}
      </div>
    </>
  );
};
