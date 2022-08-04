import { TokenPickerMode, TokenPickerPivot } from './tokenpickerpivot';
import type { IIconStyles, ITextField, ITextFieldStyles, PivotItem } from '@fluentui/react';
import { TextField, FontSizes, Icon, Callout, DirectionalHint } from '@fluentui/react';
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
  setInTokenPicker?: Dispatch<SetStateAction<boolean>>;
  onSearchTextChanged?: SearchTextChangedEventHandler;
}
export default function TokenPicker({
  editorId,
  labelId,
  searchText,
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

  const tokenPickerPlaceHolderText = intl.formatMessage({
    defaultMessage: 'Search dynamic content',
    description: 'Placeholder text to search token picker',
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
            />
          </div>
        </div>
      </div>
    </Callout>
  );
}
