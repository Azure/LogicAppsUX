import { makeStyles } from '@fluentui/react-components';

export const useRecommendationPanelContextStyles = makeStyles({
  container: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
