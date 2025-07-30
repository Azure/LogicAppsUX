import { makeStyles, tokens } from '@fluentui/react-components';

export const useReviewListStyles = makeStyles({
  succeededIcon: {
    color: tokens.colorPaletteGreenForeground1,
  },
  warningIcon: {
    color: tokens.colorPaletteMarigoldForeground1,
  },
  failedIcon: {
    color: tokens.colorPaletteRedForeground1,
  },
  reviewTree: {
    width: '100%',
  },
  shimmerContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalXXL,
    marginBottom: tokens.spacingVerticalXXL,
  },
  shimmerItem: {
    margin: `${tokens.spacingVerticalMNudge} 0`,
  },
});
