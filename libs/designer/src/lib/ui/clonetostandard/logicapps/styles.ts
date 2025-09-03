import { makeStyles, tokens } from '@fluentui/react-components';

const borderStyle = `1px solid ${tokens.colorNeutralBackground6}`;
const mainGap = '16px';

export const useCloneTabStyles = makeStyles({
  tabContainer: {
    padding: `${mainGap} 0`,
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'auto',
    gap: mainGap,
  },

  mainSection: {
    padding: mainGap,
  },

  mainSectionWithBorder: {
    padding: mainGap,
    borderRadius: '8px',
    border: borderStyle,
  },

  section: {
    borderRadius: '8px',
    border: borderStyle,
    padding: mainGap,
    backgroundColor: tokens.colorNeutralBackground1,
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    position: 'relative',
    borderBottom: borderStyle,
  },

  sectionDescription: {
    marginTop: '8px',
  },

  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    paddingTop: mainGap,
    maxWidth: '70%',
  },
});
