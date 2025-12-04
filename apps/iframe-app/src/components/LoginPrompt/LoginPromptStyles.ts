import { makeStyles, tokens, shorthands } from '@fluentui/react-components';

export const useLoginPromptStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  card: {
    padding: '40px 20px',
    maxWidth: '400px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  iconContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.margin('0', 'auto', '20px'),
  },
  icon: {
    fontSize: '32px',
    color: tokens.colorNeutralForegroundOnBrand,
  },
  message: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  errorMessage: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    color: tokens.colorPaletteRedForeground1,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    textAlign: 'center',
    marginBottom: tokens.spacingVerticalM,
    width: '100%',
  },
  button: {
    minWidth: '200px',
    height: '44px',
  },
  spinner: {
    marginRight: tokens.spacingHorizontalS,
  },
});
