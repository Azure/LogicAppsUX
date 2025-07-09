import { useMcpStandardStyles } from './styles';
import { Text, Spinner } from '@fluentui/react-components';

export const AwaitingConnection = () => {
  const styles = useMcpStandardStyles();

  return (
    <div className={styles.awaitingContainer}>
      <Spinner size="large" />
      <Text size={500} weight="semibold" as="h2">
        Awaiting Connection
      </Text>
      <Text size={300} style={{ marginTop: '12px', opacity: 0.8 }}>
        Please select a Logic App from the Developer Toolbox to get started.
      </Text>
    </div>
  );
};
