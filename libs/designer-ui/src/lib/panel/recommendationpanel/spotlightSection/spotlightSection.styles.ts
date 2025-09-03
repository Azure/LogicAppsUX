import { makeStyles, tokens } from '@fluentui/react-components';

export const useSpotlightSectionStyles = makeStyles({
  spotlightSectionContainer: {
    margin: '8px 0',
    padding: '0 16px',
    borderRadius: '8px',
  },

  spotlightSectionHeader: {
    display: 'flex',
    alignItems: 'center',
  },

  spotlightSectionHeaderButton: {
    flexGrow: '1',
    '& button': {
      padding: '0',
    },
  },

  spotlightSectionBody: {
    paddingBottom: '12px',
  },

  linkText: {
    marginLeft: 'auto',
    marginRight: tokens.spacingHorizontalM,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    '&:hover': {
      color: tokens.colorNeutralForeground1,
    },
  },
});
