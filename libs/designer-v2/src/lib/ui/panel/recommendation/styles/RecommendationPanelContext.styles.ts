import { makeStyles, tokens } from '@fluentui/react-components';

export const useRecommendationPanelContextStyles = makeStyles({
  container: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colorNeutralBackground2,
    padding: '12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  backButton: {
    marginRight: '12px',
  },
  description: {
    opacity: '0.8',
    fontWeight: '400',
  },
});
