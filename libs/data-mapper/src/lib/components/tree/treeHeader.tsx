import type { ISearchBoxStyleProps, ISearchBoxStyles, IStyleFunctionOrObject } from '@fluentui/react';
import { SearchBox } from '@fluentui/react';
import { Body1, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

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

const useStyles = makeStyles({
  header: {
    ...typographyStyles.body1Strong,
    paddingBottom: '10px',
    display: 'block',
  },
});

interface TreeHeaderProps {
  title?: string;
  onSearch: (searchTerm: string) => void;
  onClear: () => void;
}

export const TreeHeader = ({ title, onSearch, onClear }: TreeHeaderProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const searchLoc = intl.formatMessage({
    defaultMessage: 'Search',
    description: 'Search',
  });

  return (
    <span>
      {title && <Body1 className={styles.header}>{title}</Body1>}
      <SearchBox onSearch={onSearch} onClear={onClear} styles={searchBoxStyles} placeholder={searchLoc}></SearchBox>
    </span>
  );
};
