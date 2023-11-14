import type { IGroupedGroup, IGroupedItem } from '../../run-service';
import type { InitializedWorkflowState } from '../../state/WorkflowSlice';
import type { RootState } from '../../state/store';
import { ReviewList } from '../components/reviewList/reviewList';
import { parseValidationData } from '../export/validation/helper';
import { useSelector } from 'react-redux';

export const ReviewApp: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { reviewContent } = workflowState as InitializedWorkflowState;

  const { validationItems = [], validationGroups = [] }: { validationItems: IGroupedItem[]; validationGroups: IGroupedGroup[] } =
    parseValidationData(reviewContent);

  return workflowState.initialized ? <ReviewList validationItems={validationItems} validationGroups={validationGroups} /> : null;
};
