/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type React from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import { LogicAppTypeStep } from './logicAppTypeStep';
import { WorkflowTypeStepAlt } from './workflowTypeStepAlt';
import { DotNetFrameworkStep } from './dotNetFrameworkStep';
import { WorkspaceNameStep } from './workspaceNameStep';

export const ProjectSetupStep: React.FC = () => {
  const styles = useCreateWorkspaceStyles();

  return (
    <div className={styles.formSection}>
      <WorkspaceNameStep />
      <LogicAppTypeStep />
      <DotNetFrameworkStep />
      <WorkflowTypeStepAlt />
    </div>
  );
};
