import { SearchBox } from '@fluentui/react/lib/SearchBox';
import * as React from 'react';

export interface SearchBoxProps {
  onSearch: (term: string) => void;
}

export const DesignerSearchBox: React.FC<SearchBoxProps> = (props) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const updateTerm = (event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
    setSearchTerm(newValue ?? '');
  };

  return (
    <label title="Search for operations">
      <SearchBox onChange={(e, value) => updateTerm(e, value)} onSearch={(term) => props.onSearch(term)} />
    </label>
  );
};
