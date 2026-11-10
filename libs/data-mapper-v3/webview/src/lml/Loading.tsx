import { FluentProvider, makeStyles, Spinner } from '@fluentui/react-components';
import { getVsCodeFluentTheme } from '../fluentTheme';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    padding: '24px',
    backgroundColor: 'var(--vscode-editor-background)',
    color: 'var(--vscode-editor-foreground)',
  },
});

export const Loading = () => {
  const styles = useStyles();
  return (
    <FluentProvider theme={getVsCodeFluentTheme()} className={styles.root}>
      <Spinner size="large" label="Loading schemas and functions.." labelPosition="below" />
    </FluentProvider>
  );
};
