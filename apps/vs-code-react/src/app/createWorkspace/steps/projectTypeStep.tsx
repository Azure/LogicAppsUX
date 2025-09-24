/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RadioGroup, Radio, Text } from '@fluentui/react-components';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspace/createWorkspaceSlice';
import { setProjectType } from '../../../state/createWorkspace/createWorkspaceSlice';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';

export const ProjectTypeStep: React.FC = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { projectType } = createWorkspaceState;

  const intlText = {
    TITLE: intl.formatMessage({
      defaultMessage: 'Project Type',
      id: 'wqFL9K',
      description: 'Project type step title',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Select the type of project to create',
      id: '6AIV3O',
      description: 'Project type step description',
    }),
    NUGET_LABEL: intl.formatMessage({
      defaultMessage: 'NuGet',
      id: 'oIRuiN',
      description: 'NuGet project type option',
    }),
    BUNDLE_LABEL: intl.formatMessage({
      defaultMessage: 'Bundle',
      id: 'vps+zB',
      description: 'Bundle project type option',
    }),
  };

  const handleProjectTypeChange = (event: React.FormEvent<HTMLDivElement>, data: { value: string }) => {
    dispatch(setProjectType(data.value));
  };

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle} style={{ display: 'block' }}>
        {intlText.TITLE}
      </Text>
      <div className={styles.radioGroupContainer}>
        <RadioGroup value={projectType} onChange={handleProjectTypeChange} className={styles.radioGroup}>
          <Radio value="nuget" label={intlText.NUGET_LABEL} className={styles.radioOption} />
          <Radio value="bundle" label={intlText.BUNDLE_LABEL} className={styles.radioOption} />
        </RadioGroup>
      </div>
    </div>
  );
};
