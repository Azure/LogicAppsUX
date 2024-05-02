import type { RootState } from '../../../../core/state/templates/store';
import { useSelector } from 'react-redux';

export const QuickViewPanel = () => {
  const workflowDefinition = useSelector((state: RootState) => state.template.workflowDefinition);

  return (
    <>
      {'Quick View Panel'}
      {'Workflow Definition: '}
      {JSON.stringify(workflowDefinition)}
    </>
  );
};
