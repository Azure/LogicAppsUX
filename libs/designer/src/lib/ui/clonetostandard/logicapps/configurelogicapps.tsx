import { Field, Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/clonetostandard/store';
import { useSelector } from 'react-redux';
import { CloneResourcePicker } from './resourcepicker';

export const ConfigureLogicApps = () => {
  const {
    resource: { subscriptionId, resourceGroup, logicAppName },
  } = useSelector((state: RootState) => state);

  return (
    <div>
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
    </div>
  );
};
