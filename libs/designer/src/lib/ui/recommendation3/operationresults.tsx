import * as React from 'react';
import { useCallback } from 'react';
import { List } from '@fluentui/react/lib/List';
import { DisableableOperation, Operation, ShowMode, OperationKind } from './models';

import { isNullOrEmpty } from '../../common/utilities/Utils';
import { UserVoiceProps } from './uservoice';
import { FormattedMessage, useIntl } from 'react-intl';

export interface OperationResultsProps {
  canShowMoreOperations: boolean;
  disabled?: boolean;
  extraOperations: Operation[];
  filterText: string;
  isLoading: boolean;
  isPanelModeEnabled?: boolean;
  operationKinds: OperationKind[];
  selectedKind: string;
  showMode: ShowMode;
  visible: boolean;
  items: (DisableableOperation | UserVoiceProps)[];
  onRenderOperation?(item: DisableableOperation): JSX.Element;
  onSeeMoreOperationsClick?(): void;
  resultsRenderer?: React.ComponentType;
}

interface NoOperationsMessageProps {
  filterText: string;
  operationKinds: OperationKind[];
  selectedKind: string;
  visible: boolean;
}

interface SeeMoreOperationsProps {
  disabled?: boolean;
  visible: boolean;
  onSeeMoreOperationsClick?(): void;
}

export const OperationResults: React.FC<OperationResultsProps> = ({
  canShowMoreOperations,
  disabled,
  filterText,
  isLoading,
  operationKinds,
  selectedKind,
  items,
  showMode,
  isPanelModeEnabled,
  onRenderOperation,
  onSeeMoreOperationsClick,
  resultsRenderer: ResultsRenderer,
}) => {
  const intl = useIntl();
  const handleGetItemCountForPage = useCallback((): number => {
    return showMode === ShowMode.Operations ? 9 : 6;
  }, [showMode]);

  const handleShouldVirtualize = useCallback((): boolean => {
    return !isPanelModeEnabled;
  }, [isPanelModeEnabled]);
  if (ResultsRenderer) {
    return <ResultsRenderer />;
  }

  const ariaLabelText = intl.formatMessage({
    description: 'This is an accessability label on a list of Operations',
    defaultMessage: 'Operations',
    id: 'UIdPNN',
  });
  // NOTE(khlaksan): The no operations message's visible property checks for items.length < 2 because the User Voice link counts as an item.
  return (
    <>
      <NoOperationsMessage
        filterText={filterText}
        operationKinds={operationKinds}
        selectedKind={selectedKind}
        visible={items.length < 2 && !isLoading}
      />
      <SeeMoreOperations disabled={disabled} visible={canShowMoreOperations} onSeeMoreOperationsClick={onSeeMoreOperationsClick} />
      <List
        aria-label={ariaLabelText}
        className="msla-operations-list"
        data-automation-id="recommendation_card_operations_list"
        getItemCountForPage={handleGetItemCountForPage}
        items={items as any}
        onRenderCell={onRenderOperation as any}
        onShouldVirtualize={handleShouldVirtualize}
        data-is-scrollable="true"
      />
    </>
  );
};

const NoOperationsMessage: React.FC<NoOperationsMessageProps> = ({ filterText, operationKinds, selectedKind, visible }) => {
  const selectedOperationKind = operationKinds.find((kind) => kind.itemKey === selectedKind);
  const intl = useIntl();
  if (!visible || !selectedOperationKind) {
    return null;
  }

  const selectedOperationKindText = selectedOperationKind.linkText.toLocaleLowerCase();

  const RECOMMENDATION_NO_MATCHES_EMPTY_FILTER_WITH_KIND_TEXT = intl.formatMessage(
    {
      defaultMessage: "We couldn't find any {selectedOperationKindText}",
      id: 'bQLLgV',
      description: 'This is a message to the user that the kind of operation they are searching for in a list could not be found',
    },
    { selectedOperationKindText }
  );

  const RECOMMENDATION_NO_MATCHES_WITH_KIND_TEXT = intl.formatMessage(
    {
      defaultMessage: "We couldn't find any {selectedOperationKindText} for {filterText}",
      id: 'UcKJO+',
      description:
        'This is a message to the user that the kind of operation {selectedOperationKindText} they are searching for in a list could not be found with the search query {filterText} they gave',
    },
    { selectedOperationKindText, filterText }
  );

  const noMatchesText = isNullOrEmpty(filterText)
    ? RECOMMENDATION_NO_MATCHES_EMPTY_FILTER_WITH_KIND_TEXT
    : RECOMMENDATION_NO_MATCHES_WITH_KIND_TEXT;
  return <div className="msla-no-operations">{noMatchesText}</div>;
};

const SeeMoreOperations: React.FC<SeeMoreOperationsProps> = ({ visible, onSeeMoreOperationsClick, disabled = false }) => {
  if (!visible) {
    return null;
  }

  return (
    <button className="msla-see-more" disabled={disabled} onClick={onSeeMoreOperationsClick}>
      <FormattedMessage
        defaultMessage="See more"
        id="8yF3hc"
        description="This is text on a button to see more operations as a paging action"
      />
    </button>
  );
};
