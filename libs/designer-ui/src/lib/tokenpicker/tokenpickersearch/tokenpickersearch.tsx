import type { IntellisenseControlEvent } from '../../intellisensecontrol';
import { IntellisenseControl } from '../../intellisensecontrol';
import FxTextBoxIconBlack from '../images/fx.svg';
import FxTextBoxIcon from '../images/fx.white.svg';
import { TokenPickerMode } from '../tokenpickerpivot';
import type { IIconStyles, ITextField, ITextFieldStyles } from '@fluentui/react';
import { PrimaryButton, FontSizes, Icon, TextField, useTheme } from '@fluentui/react';
import type { editor } from 'monaco-editor';
import type { MutableRefObject } from 'react';
import { useRef } from 'react';
import { useIntl } from 'react-intl';

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

interface TokenPickerSearchProps {
  selectedKey: TokenPickerMode;
  searchQuery: string;
  expressionEditorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  setSearchQuery: (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, text?: string) => void;
  expressionEditorBlur: (e: IntellisenseControlEvent) => void;
}

export const TokenPickerSearch = ({
  selectedKey,
  searchQuery,
  expressionEditorRef,
  setSearchQuery,
  expressionEditorBlur,
}: TokenPickerSearchProps): JSX.Element => {
  const intl = useIntl();
  const { isInverted } = useTheme();
  const searchBoxRef = useRef<ITextField | null>(null);

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
    <>
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
            onChange={setSearchQuery}
            autoComplete="off"
          />
        </div>
      ) : (
        <div className="msla-token-picker-expression">
          <img src={isInverted ? FxTextBoxIconBlack : FxTextBoxIcon} role="presentation" alt="" height={32} width={32} />
          <div className="msla-expression-editor">
            <IntellisenseControl initialValue="" editorRef={expressionEditorRef} onBlur={expressionEditorBlur} />
          </div>
          <div className="msla-token-picker-action-bar">
            <PrimaryButton text={tokenPickerOK} onClick={onOKClicked} className={'msla-token-picker-OK'} />
          </div>
        </div>
      )}
    </>
  );
};
