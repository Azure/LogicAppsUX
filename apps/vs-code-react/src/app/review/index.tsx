import type { IGroupedGroup } from '../../run-service';
import type { RootState } from '../../state/store';
import { ReviewList } from '../components/reviewList/reviewList';
import { parseValidationData } from '../export/validation/helper';
import { useSelector } from 'react-redux';

export const ReviewApp: React.FC = () => {
  const projectSlice = useSelector((state: RootState) => state.project);
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { reviewContent } = workflowState;

  const { validationGroups = [] }: { validationGroups: IGroupedGroup[] } = parseValidationData(reviewContent);

  return projectSlice.initialized ? <ReviewList validationGroups={validationGroups} /> : null;
};
