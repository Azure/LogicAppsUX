import { useDispatch, useSelector } from 'react-redux';
import { ResourcePicker } from '../../common/resourcepicker/resourcepicker';
import type { AppDispatch, RootState } from '../../../core/state/clonetostandard/store';
import {
  setDestinationWorkflowAppDetails,
  setDestinationResourceGroup,
  setDestinationSubscription,
} from '../../../core/state/clonetostandard/cloneslice';

export const CloneResourcePicker = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { subscriptionId, resourceGroup, logicAppName: workflowAppName } = useSelector((state: RootState) => state.clone.destinationApp);

  return (
    <ResourcePicker
      viewMode={'default'}
      resourceState={{
        subscriptionId,
        resourceGroup,
        location: '',
        workflowAppName,
        logicAppName: undefined,
        isConsumption: false,
      }}
      onSubscriptionSelect={(value) => dispatch(setDestinationSubscription(value))}
      onResourceGroupSelect={(value) => dispatch(setDestinationResourceGroup(value))}
      onLocationSelect={(_value) => {}}
      onLogicAppSelect={(value) => dispatch(setDestinationWorkflowAppDetails(value))}
      onLogicAppInstanceSelect={(_value) => {}}
    />
  );
};
