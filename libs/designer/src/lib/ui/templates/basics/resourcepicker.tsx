import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import {
  setLocation,
  setLogicAppDetails,
  setResourceGroup,
  setSubscription,
  setWorkflowAppDetails,
} from '../../../core/state/templates/workflowSlice';
import { type BaseResourcePickerProps, ResourcePicker } from '../../common/resourcepicker/resourcepicker';

export const TemplateResourcePicker = (props: BaseResourcePickerProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { subscriptionId, resourceGroup, location, workflowAppName, logicAppName, isConsumption } = useSelector(
    (state: RootState) => state.workflow
  );

  return (
    <ResourcePicker
      {...props}
      resourceState={{
        subscriptionId,
        resourceGroup,
        location,
        workflowAppName,
        logicAppName,
        isConsumption,
      }}
      onSubscriptionSelect={(value) => dispatch(setSubscription(value))}
      onResourceGroupSelect={(value) => dispatch(setResourceGroup(value))}
      onLocationSelect={(value) => dispatch(setLocation(value))}
      onLogicAppSelect={(value) => dispatch(setWorkflowAppDetails(value))}
      onLogicAppInstanceSelect={(value) => dispatch(setLogicAppDetails(value))}
    />
  );
};
