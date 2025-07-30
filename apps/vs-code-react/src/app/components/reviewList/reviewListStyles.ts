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
    gap: tokens.spacingVerticalM,
    marginTop: tokens.spacingVerticalXXL,
    marginBottom: tokens.spacingVerticalXXL,
  },
  shimmerItem: {
    margin: `${tokens.spacingVerticalMNudge} 0`,
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    paddingRight: tokens.spacingHorizontalM,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  headerText: {
    paddingRight: tokens.spacingHorizontalM,
    fontWeight: tokens.fontWeightSemibold,
  },
  itemLayout: {
    display: 'flex',
    alignItems: 'center',
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    width: '100%',
  },
  itemField: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  fieldLabel: {
    fontWeight: tokens.fontWeightSemibold,
    minWidth: '80px',
    color: tokens.colorNeutralForeground2,
  },
  fieldValue: {
    flex: 1,
    wordBreak: 'break-word',
  },
});
