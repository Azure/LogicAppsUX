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
  containerFlexible: {
    position: 'relative',
    flex: '1',
    overflow: 'hidden',
    '& .fui-Combobox': {
      minWidth: '0 !important', // Override Fluent UI's default 250px minWidth
      width: '100%',
      fontSize: '11px', // Smaller font for better fit
      '& > div': {
        minWidth: '0 !important', // Also override inner elements
      },
      '& input': {
        minWidth: '0 !important', // Override input minWidth
        fontSize: '11px !important', // Smaller font for input
        padding: '2px 4px !important', // Tighter padding
        textOverflow: 'ellipsis', // Truncate with ellipsis if still too long
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      },
      // Target specific Fluent UI internal classes that might have minWidth
      '& [class*="fui-"]': {
        minWidth: '0 !important',
      },
      // Target the combobox base element specifically
      '& .fui-ComboboxBase': {
        minWidth: '0 !important',
      },
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
