import { Button, Field, Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/clonetostandard/store';
import { useSelector } from 'react-redux';
import { CloneResourcePicker } from '../resourcepicker';

export const CloneWizard = ({
  onExportCall,
  onClose,
}: {
  onExportCall: () => void;
  onClose: () => void;
}) => {
  const {
    resource: { subscriptionId, resourceGroup, location, logicAppName },
  } = useSelector((state: RootState) => state);
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
          <Field>Location</Field>
          <Text>{location}</Text>
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
        <Button onClick={onExportCall}>On Export</Button>
        <Button onClick={onClose}>On Close</Button>
      </div>
    </div>
  );
};
