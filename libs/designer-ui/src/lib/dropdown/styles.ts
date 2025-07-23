import { makeStyles, tokens } from '@fluentui/react-components';
import { designTokens } from '../tokens/designTokens';

export const useDropdownStyles = makeStyles({
  container: {
    position: 'relative',
    width: '100%',
    '& .fui-Combobox': {
      width: '100%',
    },
  },
  divider: {
    margin: '4px 0',
    border: 'none',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  header: {
    padding: '8px 12px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: tokens.fontSizeBase200,
  },
  noResults: {
    padding: '12px',
    textAlign: 'center',
    fontStyle: 'italic',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  moreOptions: {
    padding: '8px 12px',
    textAlign: 'center',
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    fontStyle: 'italic',
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
  option: {
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    '&:focus': {
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
  },
  selectedOption: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  multiselectTitlePlaceholder: {
    color: tokens.colorNeutralForeground3,
  },
  multiselectTitleValue: {
    color: tokens.colorNeutralForeground1,
  },
});
