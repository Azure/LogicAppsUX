/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type React from 'react';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import { LogicAppTypeStep } from './logicAppTypeStep';
import { WorkspaceNameStep } from './workspaceNameStep';
import { PackageNameStep } from './packageNameStep';

export const PackageSetupStep: React.FC = () => {
  const styles = useCreateWorkspaceStyles();

  return (
    <div className={styles.formSection}>
      <PackageNameStep />
      <WorkspaceNameStep />
      <LogicAppTypeStep />
    </div>
  );
};
