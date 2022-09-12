import type { ISearchBoxStyleProps, ISearchBoxStyles, IStyleFunctionOrObject } from '@fluentui/react';
import { SearchBox } from '@fluentui/react';
import { Body1, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import React from 'react';

interface TreeHeaderProps {
  title: string;
  onSearch: (searchTerm: string) => void;
  onClear: () => void;
}

const titleStyle = makeStyles({
  header: {
    ...typographyStyles.body1Strong,
    paddingBottom: '10px',
    display: 'block',
  },
});

export const TreeHeader: React.FC<TreeHeaderProps> = (props) => {
  const style2 = titleStyle();
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

  return (
    <span>
      <Body1 className={style2.header}>{props.title}</Body1>
      <SearchBox onSearch={props.onSearch} onClear={props.onClear} styles={searchBoxStyles} placeholder="Search"></SearchBox>
    </span>
  );
};
