import FxTextBoxIconBlack from './images/fx.svg';
import FxTextBoxIcon from './images/fx.white.svg';
import type { TokenGroup } from './models/token';
import { TokenPickerMode, TokenPickerPivot } from './tokenpickerpivot';
import { TokenPickerSection } from './tokenpickersection';
import type { IIconStyles, ITextField, ITextFieldStyles, PivotItem } from '@fluentui/react';
import { useTheme, PrimaryButton, TextField, FontSizes, Icon, Callout, DirectionalHint } from '@fluentui/react';
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
  fieldGroup: {
    padding: '0 8px 0 24px',
    height: 30,
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
  const { isInverted } = useTheme();
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
              <img src={isInverted ? FxTextBoxIconBlack : FxTextBoxIcon} role="presentation" alt="" height={32} width={32} />
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
