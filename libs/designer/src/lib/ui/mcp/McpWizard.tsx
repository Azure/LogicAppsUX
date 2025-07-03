import { Button } from '@fluentui/react-components';

export interface McpWizardProps {
  onCreateCall: () => void;
}

export const McpWizard = (props: McpWizardProps) => {
  return (
    <div>
      <h1>Mcp Wizard</h1>
      <Button appearance="primary" onClick={props.onCreateCall}>
        Create placeholder
      </Button>
    </div>
  );
};
