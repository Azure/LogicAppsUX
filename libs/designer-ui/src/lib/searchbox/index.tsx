import { getIntl } from '@microsoft/logic-apps-shared';
import constants from '../constants';
import { useMemo } from 'react';
import { SearchBox } from '@fluentui/react-components';
import { useSearchBoxStyles } from './styles';

export interface SearchBoxProps {
  searchCallback: (term: string) => void;
  placeholder?: string;
  searchTerm?: string;
}

export const DesignerSearchBox: React.FC<SearchBoxProps> = (props) => {
  const { searchCallback, searchTerm = '' } = props;
  const classes = useSearchBoxStyles();

  const intl = getIntl();
  const defaultPlaceholder = intl.formatMessage({
    defaultMessage: 'Search',
    id: 'DMugTX',
    description: 'Search placeholder text',
  });

  const placeholder = useMemo(() => {
    return props.placeholder ?? defaultPlaceholder;
  }, [props.placeholder, defaultPlaceholder]);

  return (
    <SearchBox
      maxLength={constants.PANEL.MAX_TITLE_LENGTH}
      autoFocus
      aria-label={placeholder}
      placeholder={placeholder}
      className={`${classes.root} msla-search-box`}
      onChange={(_event, data) => searchCallback(data.value ?? '')}
      value={searchTerm}
      data-automation-id="msla-search-box"
    />
  );
};
