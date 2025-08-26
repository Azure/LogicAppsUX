import { Button, Field, Text } from '@fluentui/react-components';
import type { AppDispatch, RootState } from '../../../core/state/clonetostandard/store';
import { useDispatch, useSelector } from 'react-redux';
import { CloneResourcePicker } from '../resourcepicker';
import { useCallback } from 'react';
import { updateErrorMessage } from '../../../core/state/clonetostandard/cloneslice';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';

export type CloneCallHandler = (
  sourceApps: { subscriptionId: string; resourceGroup: string; logicAppName: string }[],
  destinationApp: { subscriptionId: string; resourceGroup: string; logicAppName: string }
) => Promise<void>;

export const CloneWizard = ({
  onCloneCall,
  onClose,
}: {
  onCloneCall: CloneCallHandler;
  onClose: () => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    resource: { subscriptionId, resourceGroup, logicAppName },
    clone: {
      sourceApps,
      destinationApp: { resourceGroup: destResourceGroup, logicAppName: destLogicAppName },
      errorMessage,
    },
  } = useSelector((state: RootState) => state);

  const onCloneClick = useCallback(async () => {
    try {
      await onCloneCall(sourceApps, {
        subscriptionId,
        resourceGroup: destResourceGroup,
        logicAppName: destLogicAppName,
      });
    } catch (e: any) {
      dispatch(updateErrorMessage(e?.response?.data?.message ?? e.message));
    }
  }, [onCloneCall, subscriptionId, sourceApps, destResourceGroup, destLogicAppName, dispatch]);

  return (
    <div>
      placeholder
      <div>
        <Text size={500}>Resource Subscription</Text>
        <div>
          <Text>{subscriptionId}</Text>
        </div>
      </div>
      <br />
      <div>
        <Text size={500}>Source (Consumption)</Text>
        <div>
          <Field>Resource Group</Field>
          <Text>{resourceGroup}</Text>
        </div>
        <div>
          <Field>Logic App</Field>
          <Text>{logicAppName}</Text>
        </div>
      </div>
      <br />
      <div>
        <Text size={500}>Destination (Standard)</Text>
        <CloneResourcePicker />
      </div>
      <br />
      <div>
        <Text size={500}>Test section</Text>
        {!isUndefinedOrEmptyString(errorMessage) && <Text size={400}>Error message: {errorMessage}</Text>}
        <Button onClick={onCloneClick}>On Export</Button>
        <Button onClick={onClose}>On Close</Button>
      </div>
    </div>
  );
};
