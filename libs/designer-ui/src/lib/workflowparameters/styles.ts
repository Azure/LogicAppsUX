import { makeStyles, tokens } from '@fluentui/react-components';

export const useWorkflowParametersStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },

  heading: {
    marginTop: tokens.spacingVerticalXL,
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  addButton: {
    paddingLeft: '0px',
  },

  messageBar: {
    '& .fui-MessageBar': {
      padding: '8px 12px',
    },
  },

  listCell: {
    paddingBottom: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '8%',
    marginBottom: '30px',
  },

  emptyStateText: {
    textAlign: 'center',
    padding: '30px 50px',
  },

  parametersList: {
    display: 'flex',
    flexDirection: 'column',
  },

  parameterItem: {
    paddingBottom: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const useWorkflowParameterStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: '16px 0px',
  },

  heading: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center',
  },

  headingButton: {
    flexGrow: 1,
  },

  typeBadge: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
    marginRight: tokens.spacingHorizontalXS,
  },

  editOrDeleteButton: {
    display: 'flex',
    alignItems: 'center',
  },

  content: {
    padding: `0px ${tokens.spacingHorizontalM} ${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },

  errorDot: {
    display: 'inline-block',
    marginLeft: tokens.spacingHorizontalXS,
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    minHeight: 'auto',
  },

  fieldLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase200,
  },

  fieldEditor: {
    width: '100%', // Take full panel width
    '& .fui-Input': {
      width: '100%',
    },
    '& .fui-Dropdown': {
      width: '100%',
    },
  },

  valueField: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    alignItems: 'flex-start',
  },

  fieldError: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXXS,
  },
});
