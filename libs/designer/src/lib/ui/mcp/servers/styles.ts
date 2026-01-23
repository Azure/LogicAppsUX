import { makeStyles, tokens } from '@fluentui/react-components';

const borderStyle = `1px solid ${tokens.colorNeutralBackground6}`;
const mainGap = '16px';

export const useMcpServerStyles = makeStyles({
  buttonContainer: {
    display: 'flex',
    marginBottom: '16px',
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
    position: 'relative',
  },
  tableStyle: {
    width: '70%',
    margin: 0,
  },
  iconsCell: {
    textAlign: 'right',
  },
  toolIcon: {
    width: '20px',
    height: '20px',
    paddingRight: '8px',
    borderRadius: tokens.borderRadiusSmall,
    objectFit: 'contain',
    flexShrink: 0,
  },
});
