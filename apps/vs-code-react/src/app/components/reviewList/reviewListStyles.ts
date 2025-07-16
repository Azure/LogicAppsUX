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
});
