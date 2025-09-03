import { useMcpStandardStyles } from './styles';
import { Text, Badge } from '@fluentui/react-components';

export const McpHeader = ({
  isConnected,
  workflowAppData,
  canonicalLocation,
}: {
  isConnected: boolean;
  workflowAppData?: any;
  canonicalLocation?: string;
}) => {
  const styles = useMcpStandardStyles();

  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.titleSection}>
          <Text size={600} weight="semibold">
            Logic App Status:
          </Text>
          <Badge appearance={isConnected ? 'filled' : 'outline'} color={isConnected ? 'success' : 'subtle'}>
            {isConnected ? 'Connected' : 'Awaiting Connection'}
          </Badge>
        </div>
        {isConnected && workflowAppData && (
          <div className={styles.statusSection}>
            <div className={styles.connectionBadge}>
              <div className={styles.statusIndicator} />
              <Text size={200}>{workflowAppData.name || 'Logic App'}</Text>
            </div>
            <Text size={200} style={{ opacity: 0.7 }}>
              {canonicalLocation}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};
