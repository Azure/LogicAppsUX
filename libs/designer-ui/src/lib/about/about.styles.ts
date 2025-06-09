import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

export const useAboutStyles = makeStyles({
  container: {
    flexDirection: 'column',
    display: 'flex',
    ...shorthands.padding('30px', '20px'),
  },

  connectorLabel: {
    paddingBottom: '5px',
    fontFamily: designTokens.typography.semiboldFontFamily,
  },

  connectorName: {
    fontWeight: 'normal',
    ...shorthands.padding('10px', '0', '0', '0'),
    marginBottom: '30px',
  },

  descriptionLabel: {
    fontFamily: designTokens.typography.semiboldFontFamily,
  },

  description: {
    ...shorthands.padding('10px', '0', '0', '0'),
    marginBottom: '30px',
  },

  tagsLabel: {
    fontFamily: designTokens.typography.semiboldFontFamily,
  },

  tags: {
    ...shorthands.padding('10px', '0', '0', '0'),
  },

  tag: {
    ...shorthands.border(designTokens.spacing.badgeBorder, 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding('2px'),
    display: 'inline-block',
    fontSize: designTokens.typography.cardLabelFontSize,
    height: '14px',
    lineHeight: '13px',
    marginRight: '5px',
    textAlign: 'center',
    textTransform: 'uppercase',
    minWidth: designTokens.sizes.badgeWidth,
  },
});
