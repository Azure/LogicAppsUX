import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { getIntl } from '@microsoft/logic-apps-designer';

export interface SearchBoxProps {
  searchCallback: (term: string) => void;
  searchTerm?: string;
}

export const DesignerSearchBox: React.FC<SearchBoxProps> = (props) => {
  const { searchCallback, searchTerm = '' } = props;

  const intl = getIntl();
  const placeholder = intl.formatMessage({
    defaultMessage: 'Search',
    description: 'Placeholder text for Operation/Connector search bar',
  });

  return (
    <SearchBox
      autoFocus
      ariaLabel={placeholder}
      placeholder={placeholder}
      className="msla-search-box"
      onChange={(_event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => searchCallback(newValue ?? '')}
      value={searchTerm}
      data-automation-id="msla-search-box"
    />
  );
};
