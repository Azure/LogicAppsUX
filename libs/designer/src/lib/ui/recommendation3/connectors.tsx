import { List } from '@fluentui/react/lib/List';
import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

import { format, isNullOrEmpty } from '../../common/utilities/Utils';

import { AnnouncedMatches } from '../announcedmatches';
import { Categories, Connector, DisableableConnector, ShowMode } from './models';
import { UserVoice, UserVoiceProps } from './uservoice';

const CONNECTORS_PER_ROW_FOR_ACTIONS = 7;
const CONNECTORS_PER_ROW_FOR_TRIGGERS = 14;

export interface ConnectorsProps {
  connectors: Connector[];
  disabled?: boolean;
  filterText: string;
  isLoading: boolean;
  isTrigger: boolean;
  noConnectorsProps?: UserVoiceProps;
  selectedCategory: string;
  showMode: ShowMode;
  visible: boolean;
  onClearListClick?(): void;
  onRenderConnector?(item: DisableableConnector): JSX.Element;
}

interface NoConnectorsProps {
  count?: number;
  filterText?: string;
  isLoading?: boolean;
  isTrigger?: boolean;
  noConnectorsProps?: UserVoiceProps;
}

interface ClearRecentlyUsedListProps {
  disabled?: boolean;
  onClearListClick?(): void;
}

export const Connectors: React.FC<ConnectorsProps> = (props) => {
  const { visible } = props;

  const getItemCountForPage = useCallback((): number => {
    return props.connectors.length;
  }, [props.connectors.length]);
  if (!visible) {
    return null;
  }

  const {
    connectors,
    disabled,
    filterText,
    isLoading,
    isTrigger,
    noConnectorsProps,
    selectedCategory,
    showMode,
    onClearListClick,
    onRenderConnector,
  } = props;

  // NOTE(joechung): Work around scroll position being preserved unintentionally when switching modes by truncating the lists in "Both" mode.
  const visibleConnectors =
    showMode === ShowMode.Both
      ? connectors.slice(0, isTrigger ? CONNECTORS_PER_ROW_FOR_TRIGGERS : CONNECTORS_PER_ROW_FOR_ACTIONS)
      : connectors;

  const items: DisableableConnector[] = visibleConnectors.map((visibleConnector) => ({ ...visibleConnector, disabled: !!disabled }));

  if (selectedCategory === Categories.FORYOU) {
    return (
      <div className="msla-connectors msla-for-you">
        <div className="msla-recently-used-connectors-title">
          <FormattedMessage
            defaultMessage="Recent"
            id="XEdXNu"
            description="This is a header for a section that shows recently used connecters"
          />
        </div>
        <ClearRecentlyUsedList disabled={disabled} onClearListClick={onClearListClick} />
        {connectors.length === 0 ? (
          <div className="msla-no-connectors">
            <header>
              <FormattedMessage defaultMessage="There are no recent connectors to show" id="TY45/m" />
            </header>
          </div>
        ) : null}
        <List getItemCountForPage={getItemCountForPage} items={items} onRenderCell={onRenderConnector as any} />
      </div>
    );
  }

  const connectorsClassName = showMode === ShowMode.Connectors ? `msla-connectors msla-connectors-only` : `msla-connectors`;

  return (
    <div className={connectorsClassName}>
      <NoConnectors
        count={connectors.length}
        filterText={filterText}
        isLoading={isLoading}
        isTrigger={isTrigger}
        noConnectorsProps={noConnectorsProps}
      />
      <List getItemCountForPage={getItemCountForPage} items={items} onRenderCell={onRenderConnector as any} />
      <AnnouncedMatches
        count={connectors.length}
        isLoading={isLoading}
        visible={showMode === ShowMode.Connectors && filterText.length > 0}
      />
    </div>
  );
};

const ClearRecentlyUsedList: React.FC<ClearRecentlyUsedListProps> = (props) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const clearButtonRef = useRef<HTMLElement | null>(null);
  const { disabled = false, onClearListClick } = props;

  const handleNoClicked = useCallback(() => {
    setShowConfirmation(false);
    clearButtonRef.current?.focus();
  }, []);

  const handleYesClicked = useCallback(() => {
    if (onClearListClick) {
      onClearListClick();
    }
    setShowConfirmation(false);
    clearButtonRef.current?.focus();
  }, [onClearListClick]);

  const handleClearClicked = useCallback(() => {
    setShowConfirmation(true);
  }, []);

  if (showConfirmation) {
    return (
      <div className="msla-recently-used-clear">
        <FormattedMessage defaultMessage="Clear?" id="qNMcGy" description="A confirmation label with buttons following saying yes or no" />
        <button className="msla-recently-used-clear-button" onClick={handleYesClicked}>
          <FormattedMessage defaultMessage="Yes" id="mE/bhX" description="Answer to a confirmation message asking to clear or not" />
        </button>
        <button className="msla-recently-used-clear-button" onClick={handleNoClicked}>
          <FormattedMessage defaultMessage="No" id="h9XgiJ" description="Answer to a confirmation message asking to clear or not" />
        </button>
      </div>
    );
  } else {
    return (
      <div className="msla-recently-used-clear">
        <button
          className="msla-recently-used-clear-button"
          disabled={disabled}
          onClick={handleClearClicked}
          ref={(e) => (clearButtonRef.current = e)}
        >
          <FormattedMessage defaultMessage="Clear" id="q3+FXI" description="A label on a button" />
        </button>
      </div>
    );
  }
};

const NoConnectors: React.FC<NoConnectorsProps> = (props) => {
  const { count = 0, isLoading, noConnectorsProps } = props;
  const intl = useIntl();
  if (count > 0 || isLoading) {
    return null;
  }

  const { filterText } = props;

  const RECOMMENDATION_NO_MATCHES_EMPTY_FILTER_TEXT = intl.formatMessage({
    defaultMessage: "We couldn't find any results",
    id: 'JXhiR+',
  });

  const RECOMMENDATION_NO_MATCHES_TEXT = intl.formatMessage(
    {
      defaultMessage: "We couldn't find any results for {filterText}",
      description: 'This is the message for a section when a user searches for term {filterMessage} but there are no results for it',
      id: 'lUTDU8',
    },
    {
      filterText,
    }
  );
  const noConnectorsText = isNullOrEmpty(filterText)
    ? RECOMMENDATION_NO_MATCHES_EMPTY_FILTER_TEXT
    : format(RECOMMENDATION_NO_MATCHES_TEXT, filterText);

  return (
    <section className="msla-no-connectors">
      <header>{noConnectorsText}</header>
      <UserVoice {...noConnectorsProps} segments={noConnectorsProps?.segments ?? []} />
    </section>
  );
};
