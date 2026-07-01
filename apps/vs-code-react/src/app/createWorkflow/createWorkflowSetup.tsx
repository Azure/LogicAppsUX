/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { useCreateWorkspaceStyles } from '../createWorkspace/createWorkspaceStyles';
import { WorkflowTypeStep } from '../createWorkspace/steps/workflowTypeStep';

export const CreateWorkflowSetup = () => {
  const styles = useCreateWorkspaceStyles();

  return (
    <div className={styles.formSection}>
      <WorkflowTypeStep />
    </div>
  );
};
