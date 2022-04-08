import { SearchBox } from '@fluentui/react/lib/SearchBox';
import * as React from 'react';
import { useQuery } from 'react-query';

export interface SearchBoxProps {
  name: string;
}

// const getSearchResult = (term: string): Promise<SearchResult> => {
//   const searchService2 = SearchService();
//   const data = searchService
// }

export const DesignerSearchBox: React.FC<SearchBoxProps> = (props) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const { data } = useQuery(['searchResult', { searchTerm }], () => new Promise((resolve) => null), {
    enabled: !!searchTerm,
  });

  const updateTerm = (event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
    setSearchTerm(newValue ?? '');
  };

  return (
    <label title={props.name}>
      <SearchBox onChange={(e, value) => updateTerm(e, value)} />
    </label>
  );
};
