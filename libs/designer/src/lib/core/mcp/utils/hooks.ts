import { useCallback, useEffect, useState } from 'react';
import type { UpdateParametersPayload, NodeInputs } from '../../../core/state/operation/operationMetadataSlice';
import { updateNodeParameters } from '../../../core/state/operation/operationMetadataSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

interface Snapshot {
  inputParameters: NodeInputs;
}

export const useEditSnapshot = (operationId: string | null) => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  const { inputParameters } = useSelector((state: RootState) => ({
    inputParameters: state.operation.inputParameters,
  }));

  useEffect(() => {
    if (operationId && !snapshot) {
      const currentInputParams = inputParameters[operationId];

      if (currentInputParams) {
        const newSnapshot: Snapshot = {
          inputParameters: JSON.parse(JSON.stringify(currentInputParams)),
        };

        setSnapshot(newSnapshot);

        LoggerService().log({
          level: LogEntryLevel.Verbose,
          area: 'MCP.EditOperation',
          message: 'Created editing snapshot',
          args: [operationId],
        });
      }
    }
  }, [operationId, snapshot, inputParameters]);

  useEffect(() => {
    return () => {
      setSnapshot(null);
    };
  }, [operationId]);

  const restoreSnapshot = useCallback(() => {
    if (!operationId || !snapshot) {
      LoggerService().log({
        level: LogEntryLevel.Warning,
        area: 'MCP.EditOperation',
        message: 'Cannot restore: no operation or snapshot',
        args: [operationId, !!snapshot],
      });
      return;
    }

    const parametersToRestore: UpdateParametersPayload['parameters'] = [];

    Object.entries(snapshot.inputParameters.parameterGroups).forEach(([groupId, originalGroup]) => {
      originalGroup.parameters.forEach((originalParam) => {
        parametersToRestore.push({
          groupId,
          parameterId: originalParam.id,
          propertiesToUpdate: {
            value: originalParam.value,
            conditionalVisibility: originalParam.conditionalVisibility,
          },
        });
      });
    });

    if (parametersToRestore.length > 0) {
      dispatch(
        updateNodeParameters({
          nodeId: operationId,
          parameters: parametersToRestore,
          isUserAction: false,
        })
      );
    }

    LoggerService().log({
      level: LogEntryLevel.Verbose,
      area: 'MCP.EditOperation',
      message: 'Restored state from snapshot',
      args: [operationId, parametersToRestore.length],
    });
  }, [dispatch, operationId, snapshot]);

  const clearSnapshot = useCallback(() => {
    setSnapshot(null);

    if (operationId) {
      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'MCP.EditOperation',
        message: 'Cleared editing snapshot',
        args: [operationId],
      });
    }
  }, [operationId]);

  return {
    hasSnapshot: !!snapshot,
    restoreSnapshot,
    clearSnapshot,
  };
};
