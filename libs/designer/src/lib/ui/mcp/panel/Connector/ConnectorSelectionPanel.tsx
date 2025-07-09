import { useState } from 'react';
import { Text, Button, SearchBox } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useConnectorSelectionStyles } from './styles';
import { ConnectorBrowseView } from './ConnectorBrowseView';
import { useAllManagedConnectors } from '../../../../core/mcp/utils/queries';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

interface ConnectorSelectionPanelProps {
  onDismiss: () => void;
  onConnectorSelect: (connectorId: string) => void;
}

export const ConnectorSelectionPanel = ({ onDismiss, onConnectorSelect }: ConnectorSelectionPanelProps) => {
  const intl = useIntl();
  const styles = useConnectorSelectionStyles();

  const [searchTerm, setSearchTerm] = useState('');

  const { data: allConnectors, isLoading: isLoadingConnectors } = useAllManagedConnectors();

  const INTL_TEXT = {
    title: intl.formatMessage({
      id: 'SH50TJ',
      defaultMessage: 'Add Connectors',
      description: 'Title for connector selection panel',
    }),
    searchPlaceholder: intl.formatMessage({
      id: 'qRqo+P',
      defaultMessage: 'Search connectors...',
      description: 'Placeholder text for connector search input',
    }),
    closeAriaLabel: intl.formatMessage({
      id: 'kdCuJZ',
      defaultMessage: 'Close panel',
      description: 'Aria label for close button',
    }),
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={onDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </div>

      <div className={styles.searchSection}>
        <SearchBox
          placeholder={INTL_TEXT.searchPlaceholder}
          value={searchTerm}
          onChange={(_, data) => setSearchTerm(data.value)}
          style={{ width: '100%', maxWidth: 'unset' }}
        />
      </div>

      <div className={styles.content}>
        <ConnectorBrowseView
          connectors={allConnectors || []}
          isLoading={isLoadingConnectors}
          onConnectorSelect={onConnectorSelect}
          searchTerm={searchTerm}
        />
      </div>
    </div>
  );
};
