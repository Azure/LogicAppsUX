/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type React from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import { LogicAppTypeStep } from './logicAppTypeStep';
import { WorkflowTypeStep } from './workflowTypeStep';
import { DotNetFrameworkStep } from './dotNetFrameworkStep';
import { WorkspaceNameStep } from './workspaceNameStep';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../state/store';
import { useMemo } from 'react';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { isEmptyString } from '@microsoft/logic-apps-shared';

export const ProjectSetupStep: React.FC = () => {
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace);
  const { logicAppType } = createWorkspaceState;

  const shouldRenderDotnetStep = useMemo(() => {
    return logicAppType === ProjectType.customCode || logicAppType === ProjectType.rulesEngine;
  }, [logicAppType]);

  const shouldRenderWorkflowTypeStep = useMemo(() => {
    return !isEmptyString(logicAppType) && logicAppType !== ProjectType.agentCodeful;
  }, [logicAppType]);

  return (
    <div className={styles.formSection}>
      <WorkspaceNameStep />
      <LogicAppTypeStep />
      {shouldRenderDotnetStep ? <DotNetFrameworkStep /> : null}
      {shouldRenderWorkflowTypeStep ? <WorkflowTypeStep /> : null}
    </div>
  );
};
