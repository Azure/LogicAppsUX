import { useDispatch, useSelector } from 'react-redux';
import { ResourcePicker } from '../common/resourcepicker/resourcepicker';
import type { AppDispatch, RootState } from '../../core/state/clonetostandard/store';
import {
  setDestinationWorkflowAppDetails,
  setDestinationResourceGroup,
  setDestinationSubscription,
} from '../../core/state/clonetostandard/cloneslice';

export const CloneResourcePicker = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { subscriptionId: resourceSubscriptionId } = useSelector((state: RootState) => state.resource);
  const { resourceGroup, logicAppName } = useSelector((state: RootState) => state.clone.destinationApp);

  return (
    <ResourcePicker
      viewMode={'alllogicapps'}
      lockField={'subscription'}
      resourceState={{
        subscriptionId: resourceSubscriptionId,
        resourceGroup,
        location: '',
        workflowAppName: undefined,
        logicAppName,
        isConsumption: false,
      }}
      onSubscriptionSelect={(value) => dispatch(setDestinationSubscription(value))}
      onResourceGroupSelect={(value) => dispatch(setDestinationResourceGroup(value))}
      onLocationSelect={(_value) => {}}
      onLogicAppSelect={(_value) => {}}
      onLogicAppInstanceSelect={(value) => dispatch(setDestinationWorkflowAppDetails(value))}
    />
  );
};
