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
      borderBottomColor: tokens.colorBrandForeground1,
      borderBottomWidth: '2px',
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
