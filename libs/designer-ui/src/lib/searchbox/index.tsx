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

  return <SearchBox className="msla-search-box" onChange={(e, value) => updateTerm(e, value)} onSearch={(term) => props.onSearch(term)} />;
};
