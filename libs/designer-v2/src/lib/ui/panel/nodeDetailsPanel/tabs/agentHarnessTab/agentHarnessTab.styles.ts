import { makeStyles, tokens } from '@fluentui/react-components';

export const useAgentHarnessTabStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
  },
  sectionSubtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  infoIcon: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',
  },
  sandboxStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: tokens.colorPaletteGreenForeground1,
    flexShrink: 0,
  },
  statusDotFailed: {
    backgroundColor: tokens.colorPaletteRedForeground1,
  },
  statusDotPending: {
    backgroundColor: tokens.colorPaletteYellowForeground1,
  },
  snapshotText: {
    wordBreak: 'break-all' as const,
  },
  skillsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  skillCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  skillField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  skillValue: {
    wordBreak: 'break-all' as const,
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  tokenPill: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '20px',
    lineHeight: '20px',
    paddingLeft: '24px',
    paddingRight: '6px',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    borderRadius: tokens.borderRadiusMedium,
    position: 'relative',
    maxWidth: '200px',
    userSelect: 'none',
    '& .expression-token-icon': {
      position: 'absolute',
      left: '2px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '16px',
      height: '16px',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
      backgroundPosition: 'center',
      borderRadius: tokens.borderRadiusSmall,
    },
    '& .expression-token-title': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      color: tokens.colorNeutralForeground1,
    },
  },
});
