import { Button } from '@fluentui/react-components';

export interface McpWizardProps {
  onCreateCall: () => void;
}

export const McpWizard = (props: McpWizardProps) => {
  // Note: Below is a placeholder
  return (
    <div>
      <h1>Mcp Wizard placeholder</h1>
      <Button appearance="primary" onClick={props.onCreateCall}>
        Create
      </Button>
    </div>
  );
};
