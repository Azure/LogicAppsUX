import { Button, Field, Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/clonetostandard/store';
import { useSelector } from 'react-redux';

export const CloneWizard = ({
  onExportCall,
  onClose,
}: {
  onExportCall: () => void;
  onClose: () => void;
}) => {
  const {
    resource: { subscriptionId, logicAppName },
  } = useSelector((state: RootState) => state);
  return (
    <div>
      placeholder
      <div>
        <Field>Subscription</Field>
        <Text>{subscriptionId}</Text>
      </div>
      <div>
        <Field>Source (Consumption)</Field>
        <Text>{logicAppName}</Text>
      </div>
      <div>
        <Field>Destination (Standard)</Field>
        <Text>{logicAppName}</Text>
      </div>
      <div>
        <Button onClick={onExportCall}>On Export</Button>
        <Button onClick={onClose}>On Close</Button>
      </div>
    </div>
  );
};
