import { makeStyles, tokens } from '@fluentui/react-components';

export const useGridStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalXL,
    minHeight: '100px',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    width: '100%',
  },
  itemWrapper: {
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
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
  itemContent: {
    paddingLeft: `${tokens.spacingHorizontalS}`,
    width: '100%',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalL}`,
    textAlign: 'center',
    gap: tokens.spacingVerticalM,
    minHeight: '200px',
  },
});
