import { Panel } from '@fluentui/react';
import type { FunctionComponent } from 'react';

export type OutputPaneProps = {
  isOpen: boolean;
};

export const OutputPane: FunctionComponent<OutputPaneProps> = (props: OutputPaneProps) => {
  const isOpen = props.isOpen;

  return (
    <Panel headerText="Sample panel" isOpen={isOpen}>
      <p>Sample content</p>
    </Panel>
  );
};
