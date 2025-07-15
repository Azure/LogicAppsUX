import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { openOperationPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useCallback, useMemo } from 'react';
import { AppGeneric24Regular } from '@fluentui/react-icons';
import { Spinner, Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { OperationItem } from '../wizard/OperationItem';
import { useMcpWizardStyles } from '../wizard/styles';
import { deinitializeNodes, deinitializeOperationInfo } from '../../../core/state/operation/operationMetadataSlice';

export const ListOperations = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { operationInfos, isInitializingOperations, operationMetadata } = useSelector((state: RootState) => ({
    operationInfos: state.operation.operationInfo,
    isInitializingOperations: state.operation.loadStatus.isInitializingOperations,
    operationMetadata: state.operation.operationMetadata,
  }));

  const styles = useMcpWizardStyles();

  const handleEditOperation = useCallback(
    (operationId: string) => {
      dispatch(
        openOperationPanelView({
          selectedOperationId: operationId,
        })
      );
    },
    [dispatch]
  );

  const handleDeleteOperation = useCallback(
    (operationId: string) => {
      dispatch(deinitializeOperationInfo({ id: operationId }));
      dispatch(deinitializeNodes([operationId]));
    },
    [dispatch]
  );

  const allOperations = useMemo(() => {
    return Object.values(operationInfos).filter((info) => Boolean(info?.operationId));
  }, [operationInfos]);

  const hasOperations = allOperations.length > 0;
  const isLoadingOperations = isInitializingOperations;
  //  || (connectorIds.length > 0 && allOperations.length === 0);

  const INTL_TEXT = {
    noOperations: intl.formatMessage({
      id: '04idsj',
      defaultMessage: 'No operations configured yet',
      description: 'Message when no operations are configured',
    }),
    addOperationsFirst: intl.formatMessage({
      id: 'iWZd2h',
      defaultMessage: 'Add connectors and operations to see them here',
      description: 'Message prompting to add operations',
    }),
    loadingOperationsText: intl.formatMessage({
      id: 'VFaFVs',
      defaultMessage: 'Loading operations...',
      description: 'Loading message for operations',
    }),
  };

  return (
    <div>
      {isLoadingOperations ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
          <Spinner size="medium" label={INTL_TEXT.loadingOperationsText} />
        </div>
      ) : hasOperations ? (
        <div className={styles.operationsList}>
          {allOperations.map((operationInfo) => {
            if (!operationInfo?.operationId || !operationInfo?.connectorId) {
              return null;
            }

            const metadata = operationMetadata[operationInfo.operationId];

            return (
              <OperationItem
                key={operationInfo.operationId}
                operationId={operationInfo.operationId}
                operationName={operationInfo.operationId}
                connectorIcon={metadata?.iconUri}
                connectorName={metadata?.connectorTitle ?? operationInfo.connectorId}
                onEdit={handleEditOperation}
                onDelete={handleDeleteOperation}
              />
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyOperationsIcon}>
            <AppGeneric24Regular />
          </div>
          <Text size={400} weight="medium" style={{ marginBottom: '8px' }}>
            {INTL_TEXT.noOperations}
          </Text>
          <Text size={300} style={{ opacity: 0.7 }}>
            {INTL_TEXT.addOperationsFirst}
          </Text>
        </div>
      )}
    </div>
  );
};
