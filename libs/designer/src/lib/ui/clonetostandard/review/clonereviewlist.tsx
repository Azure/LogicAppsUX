import { Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/clonetostandard/store';
import { useSelector } from 'react-redux';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';

export const CloneReviewList = () => {
  const {
    clone: { errorMessage },
  } = useSelector((state: RootState) => state);

  return <div>{!isUndefinedOrEmptyString(errorMessage) && <Text size={400}>Error message: {errorMessage}</Text>}</div>;
};
