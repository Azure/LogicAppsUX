import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { designTokens } from '../../tokens/designTokens';

export const useGraphContainerStyles = makeStyles({
  root: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: designTokens.colors.scopev2Background, // Automatically handles theme switching
    boxSizing: 'border-box',
    ...shorthands.borderRadius('8px'),
    ...shorthands.border('2px', 'solid', tokens.colorNeutralStroke1), // Theme-aware border

    '&.selected': {
      ...shorthands.border('2px', 'solid', '#1f85ff'), // Blue selection border stays the same
    },
  },
});
