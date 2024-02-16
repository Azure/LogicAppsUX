import { TokenPickerMode } from '../../../tokenpicker';
import { useTokenTypeaheadTriggerMatch } from '../utils/tokenTypeaheadMatcher';
import type { hideButtonOptions } from './tokenpickerbutton';
import { Icon, Text, css, useTheme } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalTypeaheadMenuPlugin, MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type { TextNode } from 'lexical';
import { $getSelection, $isRangeSelection } from 'lexical';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import * as ReactDOM from 'react-dom';
import { useIntl } from 'react-intl';

class TokenOption extends MenuOption {
  title: string;
  keywords: Array<string>;
  icon: (selected: boolean, inverted: boolean) => ReactNode;
  constructor(
    title: string,
    key: string,
    options: {
      keywords?: Array<string>;
      icon: (selected: boolean, inverted: boolean) => ReactNode;
    }
  ) {
    super(title);
    this.title = title;
    this.keywords = options.keywords ?? [];
    this.icon = options.icon;
    this.key = key;
  }
}
function TokenMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: TokenOption;
}) {
  const { isInverted } = useTheme();
  let className = 'item';
  if (isSelected) {
    className += ' selected';
  }
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={className}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-item-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {option.icon(isSelected, isInverted)}
      <Text>{option.title}</Text>
    </li>
  );
}

interface TokenTypeAheadPluginProps {
  isEditorFocused?: boolean;
  hideTokenPickerOptions?: hideButtonOptions;
  openTokenPicker: (tokenPickerMode: TokenPickerMode) => void;
}

export const TokenTypeAheadPlugin = ({ isEditorFocused, hideTokenPickerOptions, openTokenPicker }: TokenTypeAheadPluginProps) => {
  const [editor] = useLexicalComposerContext();
  const { hideDynamicContent, hideExpression } = hideTokenPickerOptions ?? {};
  const { isInverted } = useTheme();
  const checkForTriggerMatch = useTokenTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  const onSelectOption = useCallback(
    (selectedOption: TokenOption, nodeToRemove: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection) || selectedOption == null) {
          return;
        }

        if (nodeToRemove) {
          nodeToRemove.remove();
        }
      });
      closeMenu();
      openTokenPicker(selectedOption.key === 'expression' ? TokenPickerMode.EXPRESSION : TokenPickerMode.TOKEN);
    },
    [editor, openTokenPicker]
  );

  const intl = useIntl();
  const expressionButtonText = intl.formatMessage({
    defaultMessage: 'Insert Expression',
    description: 'Label for button to open expression token picker',
  });
  const dynamicDataButtonText = intl.formatMessage({
    defaultMessage: 'Insert Dynamic Content',
    description: 'Label for button to open dynamic content picker',
  });
  const options: TokenOption[] = [];
  // making the dynamic content button optional
  !hideDynamicContent &&
    options.push(
      new TokenOption(dynamicDataButtonText, 'dynamic', {
        icon: () => <Icon iconName="LightningBolt" />,
      })
    );

  // making the expression button optional
  !hideExpression &&
    options.push(
      new TokenOption(expressionButtonText, 'expression', {
        icon: () => <Icon iconName="Variable" />,
      })
    );

  return (
    <LexicalTypeaheadMenuPlugin
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onQueryChange={() => {}}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (anchorElementRef.current == null || options.length === 0) {
          return null;
        }

        return anchorElementRef.current && options.length && isEditorFocused
          ? ReactDOM.createPortal(
              <div className={css(isInverted ? 'msla-theme-dark' : null)} onMouseDown={(e) => e.preventDefault()}>
                <div className="typeahead-popover">
                  <ul>
                    {options.map((option: TokenOption, index) => (
                      <div key={option.key}>
                        <TokenMenuItem
                          index={index}
                          isSelected={selectedIndex === index}
                          onClick={() => {
                            setHighlightedIndex(index);
                            selectOptionAndCleanUp(option);
                          }}
                          onMouseEnter={() => {
                            setHighlightedIndex(index);
                          }}
                          option={option}
                        />
                      </div>
                    ))}
                  </ul>
                </div>
              </div>,
              anchorElementRef.current
            )
          : null;
      }}
    />
  );
};
