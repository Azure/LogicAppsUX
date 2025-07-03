import { Button } from '@fluentui/react-components';
import type { RootState } from 'lib/core/state/mcp/store';
import { useSelector } from 'react-redux';

export interface McpWizardProps {
  onCreateCall: () => void;
}

export const McpWizard = (props: McpWizardProps) => {
  const { subscriptionId, resourceGroup, location } = useSelector((state: RootState) => state.workflow);

  // Note: Below is a placeholder
  return (
    <div>
      <h1>Mcp Wizard placeholder</h1>
      <div>{`subscriptionId: ${subscriptionId}`}</div>
      <div>{`resourceGroup: ${resourceGroup}`}</div>
      <div>{`location: ${location}`}</div>
      <Button appearance="primary" onClick={props.onCreateCall}>
        Create
      </Button>
    </div>
  );
};
