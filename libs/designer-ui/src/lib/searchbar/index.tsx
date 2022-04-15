import { SearchBox } from '@fluentui/react/lib/SearchBox';
import * as React from 'react';

export interface SearchBoxProps {
  name: string;
  onSearch: (term: string) => void;
}

export const DesignerSearchBox: React.FC<SearchBoxProps> = (props) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const updateTerm = (event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
    setSearchTerm(newValue ?? '');
  };

  return (
    <label title={props.name}>
      <SearchBox onChange={(e, value) => updateTerm(e, value)} onSearch={(term) => props.onSearch(term)} />
    </label>
  );
};
