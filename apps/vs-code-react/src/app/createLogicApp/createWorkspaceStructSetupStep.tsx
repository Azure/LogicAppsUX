/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type React from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspace/createWorkspaceStyles';
import { WorkspaceNameStep } from '../createWorkspace/steps';

export const CreateWorkspaceStructSetupStep: React.FC = () => {
  const styles = useCreateWorkspaceStyles();

  return (
    <div className={styles.formSection}>
      <WorkspaceNameStep />
    </div>
  );
};
