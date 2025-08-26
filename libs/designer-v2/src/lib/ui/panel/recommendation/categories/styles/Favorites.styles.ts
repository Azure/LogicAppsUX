import { makeStyles, tokens } from '@fluentui/react-components';

export const useFavoritesStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  categoryTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground1,
  },
  favoriteLoadMoreLink: {
    marginLeft: 'auto',
    display: 'flex',
    marginRight: tokens.spacingHorizontalL,
    fontSize: tokens.fontSizeBase300,
    paddingTop: tokens.spacingVerticalS,
  },
});
