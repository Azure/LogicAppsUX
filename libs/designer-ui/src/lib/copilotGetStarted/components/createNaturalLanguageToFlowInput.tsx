import { ChatInput } from '../../chatbot/components/chatInputBox';
import { useBoolean, useId } from '@fluentui/react-hooks';
import { DirectionalHint } from '@fluentui/react/lib/Callout';
import type { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { ContextualMenu, ContextualMenuItemType } from '@fluentui/react/lib/ContextualMenu';
import { FontSizes } from '@fluentui/react/lib/Styling';
import type { ITextField } from '@fluentui/react/lib/TextField';
import { KeyCodes } from '@fluentui/react/lib/Utilities';
import React from 'react';

interface CreateNaturalLanguageToFlowInputProps<Suggestion extends string> {
  searchString: string;
  suggestionsHeaderLabel: string;
  setSearchString: (newSearchString: string) => void;
  onSearch: (searchString: string) => void;
  onChange?: (searchString: string) => void;
  suggestions?: Suggestion[];
  onSuggestionClick: (suggestion: Suggestion, suggestionIndex?: number) => void;
  getHistoryEntries?: (searchString: string) => string[];
  onHistoryEntryClick?: (historyEntry: string, historyIndex?: number) => void;
  placeholder: string;
  minimumSearchLength: number;
  isDisabled?: boolean;
  isSearchDisabled?: boolean;
  autoFocus?: boolean;
  dataAutomationId?: string;
}

function CreateNaturalLanguageToFlowInputInternal<Suggestion extends string>({
  searchString,
  setSearchString,
  onSearch,
  suggestions,
  onChange,
  onSuggestionClick,
  getHistoryEntries,
  onHistoryEntryClick,
  suggestionsHeaderLabel,
  placeholder,
  minimumSearchLength,
  isDisabled,
  isSearchDisabled,
  autoFocus,
  dataAutomationId,
}: CreateNaturalLanguageToFlowInputProps<Suggestion>) {
  const [shouldMenuFocusOnMount, { setTrue: focusMenuOnMount, setFalse: doNotFocusMenuOnMount }] = useBoolean(false);
  const [isMenuOpen, { setTrue: openMenu, setFalse: closeMenu }] = useBoolean(false);

  const textFieldRef = React.useRef<ITextField>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const iconButtonStyles = {
    root: { color: 'rgb(50, 49, 48)', backgroundColor: 'transparent' },
    rootDisabled: { backgroundColor: 'transparent' },
  };

  const chatInputStyles = {
    root: { width: '100%', borderWidth: 0, boxShadow: 'rgba(0, 0, 0, 0.133) 0px 1.6px 3.6px 0px, rgba(0, 0, 0, 0.11) 0px 0.3px 0.9px 0px' },
    textField: {
      root: { paddingTop: 8, marginBottom: '8px' },
      field: { fontSize: FontSizes.medium, padding: '0 12px' },
    },
    footer: { margin: '0 6px 4px 6px' },
  };

  const contextualMenuStyles = {
    root: { borderRadius: '0px 0px 8px 8px' },
    list: { marginBottom: 6 },
    subComponentStyles: { menuItem: { root: { padding: '0px 8px' } } },
  };

  const calloutStyles = {
    root: {
      borderRadius: '0px 0px 8px 8px',
      clipPath: 'inset(0px -50px -50px -50px)',
      boxShadow: 'rgba(0, 0, 0, 0.133) 0px 1.6px 3.6px 0px, rgba(0, 0, 0, 0.11) 0px 0.3px 0.9px 0px',
    },
    calloutMain: { borderRadius: '0px 0px 8px 8px' },
  };

  const tryOpenMenu = () => {
    if (!isMenuOpen && !isDisabled) {
      openMenu();
    }
  };

  const onMenuDismissed = React.useCallback((): void => {
    closeMenu();
    doNotFocusMenuOnMount();
  }, [closeMenu, doNotFocusMenuOnMount]);

  const canSearch = React.useCallback(
    (text: string): boolean => {
      const trimmedText = text.trim();
      return !isSearchDisabled && trimmedText.length >= minimumSearchLength;
    },
    [isSearchDisabled, minimumSearchLength]
  );

  const postSearch = React.useCallback((): void => {
    onMenuDismissed();
    textFieldRef.current?.blur();
  }, [onMenuDismissed]);

  const search = React.useCallback(
    (text: string): void => {
      if (canSearch(text)) {
        const searchText = text.trim();
        setSearchString(searchText);
        onSearch(searchText);
        postSearch();
      }
    },
    [canSearch, onSearch, postSearch, setSearchString]
  );

  const onSuggestionSearch = React.useCallback(
    (suggestion: Suggestion, suggestionIndex: number) => {
      onSuggestionClick(suggestion, suggestionIndex);
      postSearch();
    },
    [onSuggestionClick, postSearch]
  );

  const onHistorySearch = React.useCallback(
    (historyEntry: string, historyIndex: number) => {
      if (onHistoryEntryClick) {
        onHistoryEntryClick(historyEntry, historyIndex);
        postSearch();
      }
    },
    [onHistoryEntryClick, postSearch]
  );

  const menuItems: IContextualMenuItem[] = React.useMemo(() => {
    const items: IContextualMenuItem[] = [];
    const itemStyles = {
      label: {
        lineHeight: '17px',
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
      },
    };

    const historyItems: IContextualMenuItem[] =
      getHistoryEntries && onHistoryEntryClick
        ? getHistoryEntries(searchString).map((entry, i) => ({
            key: `history-${i}`,
            text: entry,
            onClick: () => onHistorySearch(entry, i),
            iconProps: { iconName: 'Clock', style: { color: 'unset' } },
            itemProps: { styles: itemStyles },
          }))
        : [];

    const suggestionItems: IContextualMenuItem[] = (suggestions ?? []).map((suggestion, i) => ({
      key: `suggestion-${i}`,
      text: suggestion,
      onClick: () => onSuggestionSearch(suggestion, i),
      iconProps: { iconName: 'Sparkle', style: { color: 'unset' } },
      itemProps: { styles: itemStyles },
    }));

    items.push({
      key: 'section',
      itemType: ContextualMenuItemType.Section,
      sectionProps: {
        topDivider: true,
        title: suggestionsHeaderLabel,
        items: [...historyItems, ...suggestionItems],
      },
    });

    return items;
  }, [getHistoryEntries, onHistoryEntryClick, onHistorySearch, onSuggestionSearch, searchString, suggestions, suggestionsHeaderLabel]);

  const onInputBlur = (ev: React.FocusEvent<HTMLInputElement>): void => {
    if (menuRef.current?.contains(ev.relatedTarget as Node) && !shouldMenuFocusOnMount) {
      // If user hovers on options we don't want the input to lose focus
      textFieldRef.current?.focus();
    }
  };

  const onInputChange = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
    const value = newValue ?? '';
    value ? tryOpenMenu() : onMenuDismissed();
    setSearchString(value);
    if (onChange !== undefined) {
      // TODO: change param to required later
      onChange(value);
    }
  };

  const onInputKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    switch (ev.which) {
      case KeyCodes.down: {
        if (isMenuOpen) {
          focusMenuOnMount();
        }

        ev.preventDefault();
        ev.stopPropagation();
        break;
      }

      case KeyCodes.enter: {
        search(searchString);

        ev.preventDefault();
        ev.stopPropagation();
        break;
      }

      case KeyCodes.escape: {
        if (isMenuOpen) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        onMenuDismissed();

        break;
      }

      default: {
        if (ev.defaultPrevented) {
          ev.stopPropagation();
        }
        break;
      }
    }
  };

  const onIconButtonClick = () => {
    search(searchString);
    onMenuDismissed();
  };

  const nL2FlowInputId = useId('nl2flow-input');

  return (
    <div id={nL2FlowInputId} className={'msla-naturallanguagetoflowinput-root'} data-automation-id={dataAutomationId}>
      <ChatInput
        textFieldRef={textFieldRef}
        query={searchString}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={isDisabled}
        submitButtonProps={{
          title: 'Submit', // TODO : move to resources
          disabled: isDisabled || !canSearch(searchString),
          iconProps: {
            iconName: 'Send',
            styles: iconButtonStyles,
          },
          onClick: onIconButtonClick,
        }}
        showCharCount={false}
        onQueryChange={onInputChange}
        onBlur={onInputBlur}
        onKeyDown={onInputKeyDown}
        styles={chatInputStyles}
        role="searchbox"
      />
      <ContextualMenu
        ref={menuRef}
        items={menuItems}
        hidden={!isMenuOpen}
        target={`#${nL2FlowInputId}`}
        onDismiss={onMenuDismissed}
        shouldFocusOnMount={shouldMenuFocusOnMount}
        directionalHintFixed={true}
        directionalHint={DirectionalHint.bottomLeftEdge}
        useTargetWidth={true}
        gapSpace={-8}
        calloutProps={{
          styles: calloutStyles,
        }}
        styles={contextualMenuStyles}
      />
    </div>
  );
}

export const CreateNaturalLanguageToFlowInput = CreateNaturalLanguageToFlowInputInternal;
