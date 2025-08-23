import { Button, Field, Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/clonetostandard/store';
import { useSelector } from 'react-redux';
import { CloneResourcePicker } from '../resourcepicker';
import { useCallback } from 'react';

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
  const {
    resource: { subscriptionId, resourceGroup, logicAppName },
    clone: {
      sourceApps,
      destinationApp: { resourceGroup: destResourceGroup, logicAppName: destLogicAppName },
    },
  } = useSelector((state: RootState) => state);

  const onCloneClick = useCallback(async () => {
    await onCloneCall(sourceApps, {
      subscriptionId,
      resourceGroup: destResourceGroup,
      logicAppName: destLogicAppName,
    });
  }, [onCloneCall, subscriptionId, sourceApps, destResourceGroup, destLogicAppName]);

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
        <Button onClick={onCloneClick}>On Export</Button>
        <Button onClick={onClose}>On Close</Button>
      </div>
    </div>
  );
};
