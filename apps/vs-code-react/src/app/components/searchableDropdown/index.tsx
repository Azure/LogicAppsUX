import './styles.less';
import type { ComboboxProps } from '@fluentui/react-components';
import { Combobox, Spinner, useComboboxFilter, useId } from '@fluentui/react-components';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

export interface SearchableDropdownOption {
  key: string;
  text: string;
  data?: any;
}

export interface ISearchableDropdownProps extends Omit<ComboboxProps, 'onChange'> {
  isLoading?: boolean;
  label: string;
  options: SearchableDropdownOption[];
  onChange?: (selectedOption?: SearchableDropdownOption) => void;
}

export const SearchableDropdown: React.FC<ISearchableDropdownProps> = (props) => {
  const { label, defaultValue, options = [], placeholder, onChange } = props;
  const comboId = useId('searchable-dropdown');
  const [searchText, setSearchText] = useState<string>('');
  const intl = useIntl();

  const intlText = {
    NO_OPTIONS_FOUND: intl.formatMessage({
      defaultMessage: 'No option match your search.',
      id: '76y6GF',
      description: 'No options search text',
    }),
  };

  const spinnerLoader = props.isLoading ? <Spinner className="searchable-dropdown-spinner" size="extra-small" /> : null;
  const filterOptions = useComboboxFilter(
    searchText,
    options.map((option) => option.text),
    {
      noOptionsMessage: intlText.NO_OPTIONS_FOUND,
    }
  );
  const onOptionSelect = useCallback(
    (_event: any, data: any) => {
      const selectedOption = options.find((opt) => opt.text === data.optionText);
      setSearchText(data.optionText ?? '');
      onChange?.(selectedOption);
    },
    [options, onChange]
  );

  return (
    <div className="searchable-dropdown">
      <label id={comboId}>{label}</label>
      <Combobox
        onOptionSelect={onOptionSelect}
        aria-labelledby={comboId}
        placeholder={placeholder}
        onChange={(ev) => setSearchText(ev.target.value)}
        value={searchText}
        defaultValue={defaultValue}
      >
        {filterOptions}
      </Combobox>
      {spinnerLoader}
    </div>
  );
};
