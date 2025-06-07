import { makeStyles, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

export const useLabelStyles = makeStyles({
  root: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: designTokens.typography.cardLabelFontSize,
    lineHeight: '1.25em',
    textAlign: 'left',
    wordWrap: 'break-word',
    fontWeight: '600',
  },
  requiredParameterLeft: {
    color: tokens.colorPaletteRedForeground1,
    paddingRight: '2px',
  },
  requiredParameterRight: {
    color: tokens.colorPaletteRedForeground2,
    paddingLeft: '3px',
  },
});
