import { makeStyles, tokens } from '@fluentui/react-components';

export const useFoundryAgentDetailsStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    marginTop: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: `0px 0px 0px 1px ${tokens.colorNeutralStroke2}, 0px 1px 2px -1px rgba(0, 0, 0, 0.06)`,
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
  instructionsTextarea: {
    width: '100%',
    minHeight: '200px',
    '& textarea': {
      minHeight: '200px',
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
});
