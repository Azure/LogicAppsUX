import { Button } from '@fluentui/react-components';
import type { RootState } from '../../core/state/mcp/store';
import { useSelector } from 'react-redux';
import { useCallback } from 'react';

export interface McpWizardProps {
  onCreateCall: () => void;
}

export const McpWizard = (props: McpWizardProps) => {
  const { subscriptionId, resourceGroup, location } = useSelector((state: RootState) => state.resource);

  const onLoadOperationDetails = useCallback(() => {
    // Logic to load operation details can be added here
    console.log('Loading operation details...');
  }, []);
  return (
    <div>
      <h4>Resource details being used</h4>
      <div>{`subscriptionId: ${subscriptionId}`}</div>
      <div>{`resourceGroup: ${resourceGroup}`}</div>
      <div>{`location: ${location}`}</div>
      <p>
        <Button onClick={onLoadOperationDetails}>Load Operation Details</Button>
      </p>
      <Button appearance="primary" onClick={props.onCreateCall}>
        Create
      </Button>
    </div>
  );
};
