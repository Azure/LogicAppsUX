import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { openOperationPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { Button } from '@fluentui/react-components';
import { useCallback } from 'react';

export const ListOperations = ({ connectorId }: { connectorId: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { operationInfos } = useSelector((state: RootState) => ({
    operationInfos: state.operation.operationInfo,
  }));

  const operationInfosWithConnectorId = Object.values(operationInfos)?.filter((info) => info?.connectorId === connectorId);

  const handleOperationDataClick = useCallback(
    (operationId: string) => {
      dispatch(
        openOperationPanelView({
          selectedOperationId: operationId,
        })
      );
    },
    [dispatch]
  );

  return (
    <div>
      {operationInfosWithConnectorId?.map((operationInfo) => (
        <Button key={operationInfo?.operationId} onClick={() => handleOperationDataClick(operationInfo?.operationId)}>
          {operationInfo?.operationId}
        </Button>
      ))}
    </div>
  );
};
