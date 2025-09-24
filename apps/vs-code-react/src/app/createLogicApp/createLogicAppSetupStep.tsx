/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../state/store';
import type { CreateWorkspaceState } from '../../state/createWorkspace/createWorkspaceSlice';
import { useCreateWorkspaceStyles } from '../createWorkspace/createWorkspaceStyles';
import { LogicAppTypeStep } from '../createWorkspace/steps/logicAppTypeStep';
import { WorkflowTypeStepAlt } from '../createWorkspace/steps/workflowTypeStepAlt';
import { DotNetFrameworkStep } from '../createWorkspace/steps/dotNetFrameworkStep';

export const CreateLogicAppSetupStep: React.FC = () => {
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { logicAppType, logicAppName, logicAppsWithoutCustomCode } = createWorkspaceState;

  // Check if an existing logic app is selected
  const isExistingLogicApp =
    (logicAppType === 'customCode' || logicAppType === 'rulesEngine') &&
    logicAppsWithoutCustomCode?.some((app: { label: string }) => app.label === logicAppName);

  return (
    <div className={styles.formSection}>
      <LogicAppTypeStep />
      <DotNetFrameworkStep />
      {!isExistingLogicApp && <WorkflowTypeStepAlt />}
    </div>
  );
};
