import { Button, Text } from '@fluentui/react-components';
import type { RootState } from '../../../core/state/exportconsumption/store';
import { useSelector } from 'react-redux';

export const ExportWizard = ({
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
      <Text>subscriptionId: {subscriptionId}</Text>
      <Text>resourceGroup: {resourceGroup}</Text>
      <Text>location: {location}</Text>
      <Text>logicAppName: {logicAppName}</Text>
      <Button onClick={onExportCall}>On Export</Button>
      <Button onClick={onClose}>On Close</Button>
    </div>
  );
};
