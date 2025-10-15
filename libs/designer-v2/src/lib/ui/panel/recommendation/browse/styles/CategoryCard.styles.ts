import { makeStyles, tokens } from '@fluentui/react-components';

export const useCategoryCardStyles = makeStyles({
  card: {
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'transparent',
    position: 'relative',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      '&::before': {
        opacity: 1,
      },
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '4px',
      backgroundColor: tokens.colorBrandBackground,
      borderTopLeftRadius: tokens.borderRadiusMedium,
      borderBottomLeftRadius: tokens.borderRadiusMedium,
      opacity: 0,
      transition: 'opacity 0.2s ease',
    },
  },
  cardContent: {
    display: 'flex',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalL}`,
    gap: tokens.spacingHorizontalM,
    minHeight: '50px',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusSmall,
  },
  icon: {
    color: tokens.colorNeutralForeground2,
    fontSize: '20px',
  },
  textContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  categoryTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase300,
    marginBottom: tokens.spacingVerticalXXS,
  },
  categoryDescription: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase200,
  },
  chevron: {
    color: tokens.colorNeutralForeground3,
    fontSize: '16px',
  },
});
