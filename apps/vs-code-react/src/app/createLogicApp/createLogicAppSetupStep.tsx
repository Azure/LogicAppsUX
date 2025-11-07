/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { useSelector } from 'react-redux';
import type { RootState } from '../../state/store';
import type { CreateWorkspaceState } from '../../state/createWorkspaceSlice';
import { useCreateWorkspaceStyles } from '../createWorkspace/createWorkspaceStyles';
import { LogicAppTypeStep } from '../createWorkspace/steps/logicAppTypeStep';
import { WorkflowTypeStep } from '../createWorkspace/steps/workflowTypeStep';
import { DotNetFrameworkStep } from '../createWorkspace/steps/dotNetFrameworkStep';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';

export const CreateLogicAppSetupStep = () => {
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { logicAppType, logicAppName, logicAppsWithoutCustomCode } = createWorkspaceState;

  // Check if an existing logic app is selected
  const isExistingLogicApp =
    (logicAppType === ProjectType.customCode || logicAppType === ProjectType.rulesEngine) &&
    logicAppsWithoutCustomCode?.some((app: { label: string }) => app.label === logicAppName);

  return (
    <div className={styles.formSection}>
      <LogicAppTypeStep />
      <DotNetFrameworkStep />
      {!isExistingLogicApp && <WorkflowTypeStep />}
    </div>
  );
};
