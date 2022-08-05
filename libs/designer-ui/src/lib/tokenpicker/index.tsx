import type { TokenGroup } from './models/token';
import { TokenPickerMode, TokenPickerPivot } from './tokenpickerpivot';
import { TokenPickerSection } from './tokenpickersection';
import type { IIconStyles, ITextField, ITextFieldStyles, PivotItem } from '@fluentui/react';
import { PrimaryButton, TextField, FontSizes, Icon, Callout, DirectionalHint } from '@fluentui/react';
// import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { Dispatch, SetStateAction } from 'react';
import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export type { Token as OutputToken } from './models/token';

const directionalHint = DirectionalHint.leftTopEdge;
const gapSpace = 10;
const beakWidth = 20;

const iconStyles: Partial<IIconStyles> = {
  root: {
    fontSize: FontSizes.medium,
  },
};

const textFieldStyles: Partial<ITextFieldStyles> = {
  field: {
    padding: '0 8px 0 26px',
  },
};

export type SearchTextChangedEventHandler = (e: string) => void;

export interface TokenPickerProps {
  editorId: string;
  labelId: string;
  searchText: string;
  tokenGroup?: TokenGroup[];
  setInTokenPicker?: Dispatch<SetStateAction<boolean>>;
  onSearchTextChanged?: SearchTextChangedEventHandler;
}
export default function TokenPicker({
  editorId,
  labelId,
  searchText,
  tokenGroup,
  setInTokenPicker,
  onSearchTextChanged,
}: TokenPickerProps): JSX.Element {
  // const [editor] = useLexicalComposerContext();
  const searchBoxRef = useRef<ITextField | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchText);
  const intl = useIntl();

  const [selectedKey, setSelectedKey] = useState<string>(TokenPickerMode.TOKEN);

  const handleSelectKey = (item?: PivotItem) => {
    if (item?.props?.itemKey) {
      setSelectedKey(item.props.itemKey);
    }
  };

  const handleSearchTextChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, text?: string): void => {
    if (text != null) {
      setSearchQuery(text);
      onSearchTextChanged?.(text);
    }
  };

  const onOKClicked = () => {
    console.log('OK clicked');
  };

  const tokenPickerPlaceHolderText = intl.formatMessage({
    defaultMessage: 'Search dynamic content',
    description: 'Placeholder text to search token picker',
  });

  const tokenPickerOK = intl.formatMessage({
    defaultMessage: 'OK',
    description: 'Insert Expression',
  });

  return (
    <Callout
      role="dialog"
      ariaLabelledBy={labelId}
      gapSpace={gapSpace}
      target={`#${editorId}`}
      isBeakVisible={true}
      beakWidth={beakWidth}
      directionalHint={directionalHint}
      onMouseDown={() => {
        setInTokenPicker?.(true);
      }}
      onDismiss={() => {
        setInTokenPicker?.(false);
      }}
      onRestoreFocus={() => {
        return;
      }}
    >
      <div className="msla-token-picker-container">
        <div className="msla-token-picker">
          <TokenPickerPivot selectedKey={selectedKey} selectKey={handleSelectKey} />
          {selectedKey === TokenPickerMode.TOKEN ? (
            <div className="msla-token-picker-search">
              <Icon className="msla-token-picker-search-icon" iconName="Search" styles={iconStyles} />
              <TextField
                styles={textFieldStyles}
                componentRef={(c) => (searchBoxRef.current = c)}
                maxLength={32}
                placeholder={tokenPickerPlaceHolderText}
                type="search"
                value={searchQuery}
                onChange={handleSearchTextChange}
                autoComplete="off"
              />
            </div>
          ) : (
            <div className="msla-token-picker-expression">
              <img
                src="data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzNCAzNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCBmaWxsPSIjZmZmIiB3aWR0aD0iMzQiIGhlaWdodD0iMzQiLz4NCiA8cGF0aCBmaWxsPSIjNGQ0ZjRmIiBkPSJNMTMuMTE0LDEzLjI0OGE3LjA1NCw3LjA1NCwwLDAsMSwxLjg0OS0zLjY5QTUuMyw1LjMsMCwwLDEsMTguMjE5LDcuOWMuOTg1LDAsMS40NjcuNTg1LDEuNDQ3LDEuMDY5YTEuNTUxLDEuNTUxLDAsMCwxLS43NDQsMS4xNDkuNDA2LjQwNiwwLDAsMS0uNTQzLS4wNjFjLS41NDMtLjY2NS0xLjAwNS0xLjA2OS0xLjM2Ny0xLjA2OS0uNC0uMDItLjc2NC4yODItMS40MDcsNC4yNTVoMi4zMzJsLS40MjIuODA3LTIuMDkuMTYxYy0uMzQyLDEuODM1LS42LDMuNjMtMS4xNDYsNS45MDgtLjc4NCwzLjMyNy0xLjY4OCw0LjY1OC0zLjEsNS44MjdBMy43NDYsMy43NDYsMCwwLDEsOC45NzMsMjdjLS42NjMsMC0xLjM0Ny0uNDQ0LTEuMzQ3LS45NjhhMS42OTIsMS42OTIsMCwwLDEsLjcyNC0xLjE0OWMuMTYxLS4xMjEuMjgxLS4xNDEuNDIyLS4wNGEyLjg3MywyLjg3MywwLDAsMCwxLjU2OC43MDYuNjc1LjY3NSwwLDAsMCwuNjYzLS41LDI3LjQyNywyNy40MjcsMCwwLDAsLjg0NC00LjE3NGMuNDYyLTIuNzYyLjc0NC00LjY1OCwxLjA4NS02LjY1NEgxMS4zMjVsLS4xLS4yLjY4My0uNzY2WiIvPg0KIDxwYXRoIGZpbGw9IiM0ZDRmNGYiIGQ9Ik0xNi45NDcsMTguOWMuODEyLTEuMTgzLDEuNjU0LTEuODc0LDIuMjM2LTEuODc0LjQ5LDAsLjczNS41MjIsMS4wNTcsMS40OWwuMjMuNzIyYzEuMTY0LTEuNjc1LDEuNzMxLTIuMjEyLDIuNC0yLjIxMmEuNzQyLjc0MiwwLDAsMSwuNzUxLjg0NS45MjIuOTIyLDAsMCwxLS44Ljg3Ni40MTQuNDE0LDAsMCwxLS4yOTEtLjE2OS40NzcuNDc3LDAsMCwwLS4zNjgtLjE4NGMtLjE1MywwLS4zMzcuMTA4LS42MTMuMzg0YTguNTQ3LDguNTQ3LDAsMCwwLS44NzMsMS4wNzVsLjYxMywxLjk2NmMuMTg0LjYzLjM2Ny45NTIuNTY3Ljk1Mi4xODQsMCwuNTA2LS4yNDYsMS4wNDItLjg5MWwuMzIyLjM4NGMtLjksMS40MjktMS43NjEsMS45Mi0yLjM0MywxLjkyLS41MjEsMC0uODU4LS40My0xLjE4LTEuNDlsLS4zNTItMS4xNjhjLTEuMTc5LDEuOTItMS43NDYsMi42NTgtMi41NDMsMi42NThBLjgxNS44MTUsMCwwLDEsMTYsMjMuMzA5YS45LjksMCwwLDEsLjc2Ni0uOTIyLjQ5My40OTMsMCwwLDEsLjI5MS4xNTQuNTE0LjUxNCwwLDAsMCwuMzY4LjE2OWMuMzM3LDAsLjk1LS42NzYsMS43MTUtMS44NTlsLS40LTEuMzY3Yy0uMjc2LS45MDYtLjQxNC0xLjAxNC0uNTY3LTEuMDE0LS4xMzgsMC0uNDE0LjItLjg4OC44MTRaIi8+DQo8L3N2Zz4NCg=="
                role="presentation"
                alt=""
                height={32}
                width={32}
              />
              <div className="msla-expression-editor">{/* TODO: Intellisense Editor */}</div>
              <div className="msla-token-picker-action-bar">
                <PrimaryButton text={tokenPickerOK} onClick={onOKClicked} className={'msla-token-picker-OK'} />
              </div>
            </div>
          )}
          <TokenPickerSection tokenGroup={tokenGroup ?? []} />
        </div>
      </div>
    </Callout>
  );
}
