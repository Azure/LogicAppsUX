import type { ISearchBoxStyleProps, ISearchBoxStyles, IStyleFunctionOrObject } from '@fluentui/react';
import { SearchBox } from '@fluentui/react';
import { tokens } from '@fluentui/react-components';
import { useDebouncedCallback } from '@react-hookz/web';
import { useIntl } from 'react-intl';

const searchDebounceDelay = 300;

const searchBoxStyles: IStyleFunctionOrObject<ISearchBoxStyleProps, ISearchBoxStyles> = {
  root: {
    '.ms-SearchBox': {
      borderColor: tokens.colorNeutralStroke1,
      borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStrokeAccessible}`,
    },
    '::after': {
      borderRadius: tokens.borderRadiusMedium,
      borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
      borderLeft: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
      borderRight: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    },
    ':hover': {
      borderColor: tokens.colorNeutralStroke1Hover,
      borderBottomColor: tokens.colorNeutralStrokeAccessible,
    },
    borderColor: tokens.colorNeutralStroke1,
    borderBottomColor: tokens.colorNeutralStrokeAccessible,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: '6px',
  },
};

interface TreeHeaderProps {
  onSearch: (searchTerm: string) => void;
  onClear: () => void;
}

export const TreeHeader = ({ onSearch, onClear }: TreeHeaderProps) => {
  const intl = useIntl();

  const searchLoc = intl.formatMessage({
    defaultMessage: 'Search',
    description: 'Search',
  });

  const onChangeSearchValueDebounced = useDebouncedCallback(onSearch, [], searchDebounceDelay);

  return (
    <span>
      <SearchBox
        onChange={(_e, newSearchTerm) => onChangeSearchValueDebounced(newSearchTerm ?? '')}
        onSearch={onSearch}
        onClear={onClear}
        styles={searchBoxStyles}
        placeholder={searchLoc}
      />
    </span>
  );
};
