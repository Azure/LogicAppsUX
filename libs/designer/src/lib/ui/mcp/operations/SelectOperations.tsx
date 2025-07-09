import { useCallback, useMemo } from 'react';
import { Text, Button } from '@fluentui/react-components';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { useAllConnectors } from '../../../core/queries/browse';
import { useConnectorSelectionStyles } from '../connectors/connectorSelectionStyles';
import type { RootState } from '../../../core/state/mcp/store';
import { openPanelView, McpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';

export const SelectOperations = () => {
  const intl = useIntl();
  const styles = useConnectorSelectionStyles();
  const dispatch = useDispatch();
  const { data: allConnectors } = useAllConnectors();

  const { selectedNodeId: selectedConnectorId } = useSelector((state: RootState) => state.mcpPanel);
  const selectedConnector = useMemo(() => allConnectors?.find((c) => c.id === selectedConnectorId), [allConnectors, selectedConnectorId]);
  const handleBackToBrowse = useCallback(() => {
    dispatch(
      openPanelView({
        panelView: McpPanelView.SelectConnector,
        selectedNodeId: undefined,
      })
    );
  }, [dispatch]);

  const INTL_TEXT = {
    backToBrowse: intl.formatMessage({
      id: 'YwhRHw',
      defaultMessage: 'Back to connectors',
      description: 'Button text to return to connector browse view',
    }),
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={handleBackToBrowse}>
            {INTL_TEXT.backToBrowse}
          </Button>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {selectedConnector?.properties?.displayName}
          </Text>
        </div>
      </div>

      <div className={styles.content}>
        <div>Details view for connector: {selectedConnector?.properties?.displayName}</div>
      </div>
    </div>
  );
};
