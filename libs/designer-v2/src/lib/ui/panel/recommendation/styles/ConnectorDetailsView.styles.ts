import { makeStyles, tokens } from '@fluentui/react-components';

export const useConnectorDetailsViewStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '0',
  },
  header: {
    padding: '12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  connectorIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
  },
  headerContent: {
    flex: '1',
  },
  connectorName: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
  },
  connectorDescription: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    display: 'block',
    marginTop: '2px',
  },
});
