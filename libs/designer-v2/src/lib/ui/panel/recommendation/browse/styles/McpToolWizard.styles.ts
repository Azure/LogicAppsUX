import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useMcpToolWizardStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    ...shorthands.overflow('hidden'),
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    ...shorthands.padding('12px', '0'),
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  stepNumber: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: tokens.colorNeutralBackground5,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  stepLabel: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
  },
  activeStep: {
    '& > span:first-child': {
      backgroundColor: tokens.colorBrandBackground,
      color: tokens.colorNeutralForegroundOnBrand,
    },
    '& > span:last-child': {
      color: tokens.colorNeutralForeground1,
      fontWeight: tokens.fontWeightSemibold,
    },
  },
  completedStep: {
    '& > span:first-child': {
      backgroundColor: tokens.colorBrandBackground,
      color: tokens.colorNeutralForegroundOnBrand,
    },
    '& > span:last-child': {
      color: tokens.colorNeutralForeground2,
    },
  },
  stepConnector: {
    flexGrow: 1,
    height: '2px',
    backgroundColor: tokens.colorNeutralBackground5,
    marginLeft: '12px',
    marginRight: '12px',
  },
  content: {
    flex: '1 1 0',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    ...shorthands.padding('16px'),
    minHeight: 0,
  },
  footer: {
    flexShrink: 0,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding('16px'),
  },
  stepDescription: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    marginBottom: '16px',
    flexShrink: 0,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ...shorthands.padding('32px'),
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    ...shorthands.padding('32px'),
    ...shorthands.gap('16px'),
    color: tokens.colorNeutralForeground3,
  },
  toolsContainer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  toolsSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  warningContainer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    alignItems: 'flex-start',
  },
  headersSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    alignItems: 'flex-start',
  },
  addConnectionLink: {
    marginTop: '8px',
    cursor: 'pointer',
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase300,
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  createConnectionContainer: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    overflowY: 'auto',
  },
});
