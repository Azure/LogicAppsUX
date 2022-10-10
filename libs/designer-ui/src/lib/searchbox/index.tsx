import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { getIntl } from '@microsoft-logic-apps/intl';
import { useThrottledEffect } from '@microsoft-logic-apps/utils';
import * as React from 'react';

export interface SearchBoxProps {
  searchCallback: (term: string) => void;
}

export const DesignerSearchBox: React.FC<SearchBoxProps> = (props) => {
  const intl = getIntl();
  const placeholder = intl.formatMessage({
    defaultMessage: 'Search',
    description: 'Placeholder text for Operation/Connector search bar',
  });

  const [searchTerm, setSearchTerm] = React.useState('');
  useThrottledEffect(
    () => {
      props.searchCallback(searchTerm);
    },
    [props.searchCallback, searchTerm],
    500
  );

  return (
    <SearchBox
      ariaLabel={placeholder}
      placeholder={placeholder}
      className="msla-search-box"
      onChange={(_event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => setSearchTerm(newValue ?? '')}
    />
  );
};
