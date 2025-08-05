import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/mcp/store';
import { operationHasEmptyStaticDependencies } from '../../../core/mcp/utils/helper';
import { useMemo } from 'react';
import { CheckmarkCircleFilled, Warning20Regular } from '@fluentui/react-icons';
import { tokens, Text } from '@fluentui/react-components';
import { useOperationSelectionGridStyles } from './styles';
import { useIntl } from 'react-intl';

export const OperationProgress = ({ operationId }: { operationId: string }) => {
  const styles = useOperationSelectionGridStyles();
  const intl = useIntl();
  const INTL_TEXT = {
    completeLabel: intl.formatMessage({
      defaultMessage: 'Configured',
      id: 'VnqLwv',
      description: 'Label indicating that the operation configuration is complete',
    }),
    incompleteLabel: intl.formatMessage({
      defaultMessage: 'Needs setup',
      id: 'Uz9dOw',
      description: 'Label indicating that the operation configuration is incomplete',
    }),
  };
  const { nodeInputs, dependencies } = useSelector((state: RootState) => ({
    nodeInputs: state.operations.inputParameters[operationId],
    dependencies: state.operations.dependencies[operationId],
  }));

  const isIncomplete = useMemo(
    () => operationHasEmptyStaticDependencies(nodeInputs, dependencies.inputs ?? {}),
    [nodeInputs, dependencies]
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {isIncomplete ? (
        <Warning20Regular color={tokens.colorStatusWarningBorderActive} className={styles.operationProgress} />
      ) : (
        <CheckmarkCircleFilled className={styles.operationProgress} color={tokens.colorPaletteGreenBackground3} />
      )}
      <Text style={{ verticalAlign: 'top' }}>{isIncomplete ? INTL_TEXT.incompleteLabel : INTL_TEXT.completeLabel}</Text>
    </div>
  );
};
