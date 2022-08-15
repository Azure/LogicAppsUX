import type { RootState } from '../../state/store';
import { ReviewList } from '../components/reviewList/reviewList';
import { useSelector } from 'react-redux';

export const ReviewApp: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);

  return vscodeState.initialized ? <ReviewList isValidationLoading={true} validationItems={[]} validationGroups={[]} /> : null;
};
