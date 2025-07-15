import { Button } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/mcp/store';
import { useSelector } from 'react-redux';

export interface EditOperationProps {
  updateOperationData: (data: any) => void; // Define the type of data as needed
}

export const EditOperation = ({ updateOperationData }: EditOperationProps) => {
  const { selectedOperationId, operationInfos } = useSelector((state: RootState) => ({
    selectedOperationId: state.mcpPanel.selectedOperationId,
    operationInfos: state.operation.operationInfo,
  }));

  return (
    <div>
      TODO: Edit operation parameters
      <Button
        onClick={() => {
          updateOperationData({}); // Call the update function with appropriate data
        }}
      >
        Button to test update isDirty to enable save
      </Button>
      <div>operationId: {selectedOperationId}</div>
      <div>Details view for operation: {operationInfos?.[selectedOperationId ?? '']?.type}</div>
    </div>
  );
};
