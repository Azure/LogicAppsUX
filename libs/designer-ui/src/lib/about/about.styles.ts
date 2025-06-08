import { makeStyles, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

/**
 * About panel styles migrated from about/about.less
 * Styles for connector information panel with labels, descriptions, and tags
 */
export const useAboutStyles = makeStyles({
  panelAboutContainer: {
    flexDirection: 'column',
    display: 'flex',
    padding: '30px 20px',
  },
  panelConnectorLabel: {
    paddingBottom: '5px',
    fontWeight: tokens.fontWeightSemibold,
  },
  panelConnectorName: {
    fontWeight: 'normal',
    padding: '10px 0 0 0',
    marginBottom: '30px',
  },
  panelDescriptionLabel: {
    fontWeight: tokens.fontWeightSemibold,
  },
  panelDescription: {
    padding: '10px 0 0 0',
    marginBottom: '30px',
  },
  panelTagsLabel: {
    fontWeight: tokens.fontWeightSemibold,
  },
  panelTags: {
    padding: '10px 0 0 0',
  },
  panelTag: {
    border: designTokens.borders.default,
    padding: '2px',
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
