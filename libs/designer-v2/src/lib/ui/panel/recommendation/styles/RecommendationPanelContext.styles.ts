import { makeStyles, tokens } from '@fluentui/react-components';

export const useRecommendationPanelContextStyles = makeStyles({
  container: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2,
    padding: '12px',
    margin: '0 -8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
  },
  backButton: {
    marginRight: '12px',
  },
  description: {
    opacity: '0.8',
    fontWeight: '400',
    padding: '8px 2px 0px',
  },
});
