import type { IGroupedGroup, IGroupedItem } from '../../run-service';
import type { RootState } from '../../state/store';
import type { InitializedVscodeState } from '../../state/vscodeSlice';
import { ReviewList } from '../components/reviewList/reviewList';
import { parseValidationData } from '../export/validation/helper';
import { useSelector } from 'react-redux';

export const ReviewApp: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { reviewContent } = vscodeState as InitializedVscodeState;

  const { validationItems = [], validationGroups = [] }: { validationItems: IGroupedItem[]; validationGroups: IGroupedGroup[] } =
    parseValidationData(reviewContent);

  return vscodeState.initialized ? <ReviewList validationItems={validationItems} validationGroups={validationGroups} /> : null;
};
