import { mergeStyleSets } from '@fluentui/react/lib/Styling';
import { ITextField, ITextFieldStyles, TextField } from '@fluentui/react/lib/TextField';
import * as React from 'react';

import { placeholderTextFieldStyles } from '../fabric';
import { ShowMode } from './models';
import { SearchBoxIcon } from './searchboxicon';
import { useId } from '@fluentui/react-hooks';
import { IRefObject } from '@fluentui/react';

export interface SearchBoxProps {
  disabled?: boolean;
  isLoading: boolean;
  id?: string;
  placeholder: string;
  componentRef?: IRefObject<ITextField>;
  showMode?: ShowMode;
  value: string;
  dataAutomationId?: string;
  isSearching?: boolean;
  onBackClick?(): void;
  onChange?(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newText: string): void;
}

// TODO(joechung): Re-enable the textbox clear button for Edge when https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/17584515/ is fixed.
const textFieldStyles: Partial<ITextFieldStyles> = {
  field: {
    selectors: {
      '::-ms-clear': {
        display: 'block',
      },
    },
  },
};

export const SearchBox: React.FC<SearchBoxProps> = (props) => {
  const {
    disabled = false,
    isLoading,
    placeholder,
    showMode,
    value,
    dataAutomationId,
    isSearching = false,
    onBackClick,
    onChange,
    id,
    componentRef,
  } = props;
  const searchBoxId = useId('searchbox');
  return (
    <div className="msla-search-box" id={id}>
      <SearchBoxIcon disabled={disabled} isLoading={isLoading} showMode={showMode} isSearching={isSearching} onBackClick={onBackClick} />
      <TextField
        componentRef={componentRef}
        className="msla-search-box-input"
        disabled={disabled}
        id={searchBoxId}
        maxLength={64}
        placeholder={placeholder}
        spellCheck={false}
        styles={mergeStyleSets(placeholderTextFieldStyles, textFieldStyles)}
        title={placeholder}
        type="search"
        value={value}
        onChange={onChange as any}
        data-automation-id={dataAutomationId}
      />
    </div>
  );
};
