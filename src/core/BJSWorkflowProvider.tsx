import React from 'react';

export interface BJSWorkflowProviderProps {
  workflow: LogicAppsV2.WorkflowDefinition;
  children: React.ReactNode;
}

export const BJSWorkflowProvider = ({ workflow, children }: BJSWorkflowProviderProps) => {
  console.log(workflow);
  return <div>{children}</div>;
};
