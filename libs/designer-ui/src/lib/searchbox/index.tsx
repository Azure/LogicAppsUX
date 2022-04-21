import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { getIntl } from '@microsoft-logic-apps/intl';
import * as React from 'react';

export interface SearchBoxProps {
  onSearch: (term: string) => void;
}

export const DesignerSearchBox: React.FC<SearchBoxProps> = (props) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const intl = getIntl();
  const placeholder = intl.formatMessage({
    defaultMessage: 'Search',
    description: 'Placeholder text for Operation/Connector search bar',
  });

  const updateTerm = (event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
    setSearchTerm(newValue ?? '');
  };

  return (
    <SearchBox
      ariaLabel={placeholder}
      placeholder={placeholder}
      className="msla-search-box"
      onChange={(e, value) => updateTerm(e, value)}
      onSearch={(term) => props.onSearch(term)}
    />
  );
};
