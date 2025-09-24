/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Field, Input, Label, Text, useId } from '@fluentui/react-components';
import type { InputOnChangeData } from '@fluentui/react-components';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspace/createWorkspaceSlice';
import { setLogicAppName } from '../../../state/createWorkspace/createWorkspaceSlice';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';

export const LogicAppNameStep: React.FC = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const styles = useCreateWorkspaceStyles();
  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const { logicAppName } = createWorkspaceState;
  const inputId = useId();

  const intlText = {
    TITLE: intl.formatMessage({
      defaultMessage: 'Logic App Name',
      id: 'wAGjjo',
      description: 'Logic app name step title',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Enter a name for your logic app',
      id: 'S7qgXx',
      description: 'Logic app name step description',
    }),
    LOGIC_APP_NAME_LABEL: intl.formatMessage({
      defaultMessage: 'Logic App Name',
      id: '8DlE8y',
      description: 'Logic app name input label',
    }),
  };

  const handleLogicAppNameChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
    dispatch(setLogicAppName(data.value));
  };

  return (
    <div className={styles.formSection}>
      <Text className={styles.sectionTitle} style={{ display: 'block' }}>
        {intlText.TITLE}
      </Text>
      <div className={styles.fieldContainer}>
        <Field required>
          <Label htmlFor={inputId}>{intlText.LOGIC_APP_NAME_LABEL}</Label>
          <Input id={inputId} value={logicAppName} onChange={handleLogicAppNameChange} className={styles.inputControl} />
        </Field>
      </div>
    </div>
  );
};
