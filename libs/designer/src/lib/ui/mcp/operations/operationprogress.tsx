import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/mcp/store';
import { operationHasEmptyStaticDependencies } from '../../../core/mcp/utils/helper';
import { useMemo } from 'react';
import { CheckmarkCircleFilled, CircleHintHalfVerticalFilled } from '@fluentui/react-icons';
import { tokens } from '@fluentui/react-components';
import { useOperationSelectionGridStyles } from './styles';

export const OperationProgress = ({ operationId }: { operationId: string }) => {
  const styles = useOperationSelectionGridStyles();
  const { nodeInputs, dependencies } = useSelector((state: RootState) => ({
    nodeInputs: state.operations.inputParameters[operationId],
    dependencies: state.operations.dependencies[operationId],
  }));

  const isIncomplete = useMemo(
    () => operationHasEmptyStaticDependencies(nodeInputs, dependencies.inputs ?? {}),
    [nodeInputs, dependencies]
  );

  return isIncomplete ? (
    <CircleHintHalfVerticalFilled className={styles.operationProgress} />
  ) : (
    <CheckmarkCircleFilled className={styles.operationProgress} color={tokens.colorPaletteGreenBackground3} />
  );
};
