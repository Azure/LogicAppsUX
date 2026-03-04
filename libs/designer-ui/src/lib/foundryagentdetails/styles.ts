import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useFoundryAgentDetailsStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  label: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
  },
  badge: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground4,
    borderRadius: tokens.borderRadiusSmall,
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
    paddingTop: '1px',
    paddingBottom: '1px',
    marginLeft: tokens.spacingHorizontalXS,
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
  },
  instructionsTextarea: {
    width: '100%',
    minHeight: '60px',
    '& textarea': {
      minHeight: '60px',
    },
  },
  portalLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorBrandForegroundLink,
    cursor: 'pointer',
    alignSelf: 'flex-end',
    textDecorationLine: 'none',
    lineHeight: '1',
    ':hover': {
      textDecorationLine: 'underline',
    },
  },
  toolsList: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
});
