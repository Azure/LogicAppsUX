import type { RootState } from '../../../../core/state/templates/store';
import { useSelector } from 'react-redux';

export const CreateWorkflowPanel = () => {
  const workflowDefinition = useSelector((state: RootState) => state.template.workflowDefinition);

  return (
    <>
      {'Create Workflow Panel'}
      {'Workflow Definition: '}
      {JSON.stringify(workflowDefinition)}
    </>
  );
};
