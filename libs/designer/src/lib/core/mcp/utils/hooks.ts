import { useCallback, useEffect, useState } from 'react';
import type { NodeInputs } from '../../../core/state/operation/operationMetadataSlice';
import { updateNodeParameterGroups } from '../../../core/state/operation/operationMetadataSlice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';

interface Snapshot {
  inputParameters: NodeInputs;
}

export const useEditSnapshot = (operationId: string | null) => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  const { inputParameters } = useSelector((state: RootState) => ({
    inputParameters: state.operations.inputParameters,
  }));

  useEffect(() => {
    if (!operationId) {
      setSnapshot(null);
      return;
    }
    if (!snapshot) {
      const currentInputParams = inputParameters[operationId];

      if (currentInputParams) {
        const newSnapshot: Snapshot = {
          inputParameters: JSON.parse(JSON.stringify(currentInputParams)),
        };

        setSnapshot(newSnapshot);
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
      return;
    }

    dispatch(
      updateNodeParameterGroups({
        nodeId: operationId,
        parameterGroups: snapshot.inputParameters.parameterGroups,
      })
    );
  }, [dispatch, operationId, snapshot]);

  const clearSnapshot = useCallback(() => {
    setSnapshot(null);
  }, []);

  return {
    hasSnapshot: !!snapshot,
    restoreSnapshot,
    clearSnapshot,
  };
};
