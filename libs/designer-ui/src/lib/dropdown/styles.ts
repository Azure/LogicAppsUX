import { makeStyles, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

export const useDropdownStyles = makeStyles({
  container: {
    position: 'relative',
    width: '100%',
  },
  multiselectTitle: {
    // Base styles for multiselect title
  },
  multiselectTitlePlaceholder: {
    color: designTokens.colors.parameterPlaceholder,
  },
  multiselectTitleValue: {
    color: designTokens.colors.parameterValue,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

// Dark theme overrides
export const useDropdownDarkStyles = makeStyles({
  multiselectTitlePlaceholder: {
    color: tokens.colorNeutralForeground3,
  },
  multiselectTitleValue: {
    color: tokens.colorNeutralForeground1,
  },
});
