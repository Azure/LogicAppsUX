/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Button, Spinner } from '@fluentui/react-components';
import { VSCodeContext } from '../../../webviewCommunication';
import { useCreateWorkspaceStyles } from '../createWorkspaceStyles';
import type { RootState } from '../../../state/store';
import type { CreateWorkspaceState } from '../../../state/createWorkspace/createWorkspaceSlice';
import { nextStep, previousStep, setLoading, setError, setComplete } from '../../../state/createWorkspace/createWorkspaceSlice';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';

export const Navigation: React.FC = () => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const dispatch = useDispatch();
  const styles = useCreateWorkspaceStyles();

  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const {
    currentStep,
    isLoading,
    workspaceProjectPath,
    workspaceName,
    logicAppType,
    targetFramework,
    logicAppName,
    projectType,
    openBehavior,
  } = createWorkspaceState;

  const totalSteps = 7;

  const intlText = {
    NEXT: intl.formatMessage({
      defaultMessage: 'Next',
      id: '3Wcqsy',
      description: 'Next button',
    }),
    BACK: intl.formatMessage({
      defaultMessage: 'Back',
      id: '2XH9oW',
      description: 'Back button',
    }),
    CREATE: intl.formatMessage({
      defaultMessage: 'Create Workspace',
      id: 'XZfauP',
      description: 'Create workspace button',
    }),
    CREATING: intl.formatMessage({
      defaultMessage: 'Creating...',
      id: 'k6MqI+',
      description: 'Creating workspace in progress',
    }),
    STEP_INDICATOR: intl.formatMessage(
      {
        defaultMessage: 'Step {current} of {total}',
        id: '4IV3/7',
        description: 'Step indicator text',
      },
      {
        current: currentStep + 1,
        total: totalSteps,
      }
    ),
  };

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Project Path
        return workspaceProjectPath.path !== '';
      case 1: // Workspace Name
        return workspaceName.trim() !== '';
      case 2: // Logic App Type
        return logicAppType !== '';
      case 3: // Target Framework
        return targetFramework !== '';
      case 4: // Logic App Name
        return logicAppName.trim() !== '';
      case 5: // Project Type
        return projectType !== '';
      case 6: // Open Behavior
        return openBehavior !== '';
      default:
        return false;
    }
  };

  const handleBack = () => {
    if (!isFirstStep && !isLoading) {
      dispatch(previousStep());
    }
  };

  const handleNext = () => {
    if (canProceed() && !isLoading) {
      dispatch(nextStep());
    }
  };

  const handleCreate = async () => {
    if (!canProceed() || isLoading) {
      return;
    }

    dispatch(setLoading(true));
    dispatch(setError(undefined));

    try {
      // Send the create workspace command to the extension
      const createWorkspaceData = {
        workspaceProjectPath,
        workspaceName,
        logicAppType,
        targetFramework,
        logicAppName,
        projectType,
        openBehavior,
      };

      vscode.postMessage({
        command: 'createNewWorkspace',
        data: createWorkspaceData,
      });

      dispatch(setComplete(true));
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Failed to create workspace'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className={styles.navigationContainer}>
      <div className={styles.navigationLeft}>
        <span className={styles.stepIndicator}>{intlText.STEP_INDICATOR}</span>
      </div>
      <div className={styles.navigationRight}>
        <Button appearance="secondary" onClick={handleBack} disabled={isFirstStep || isLoading}>
          {intlText.BACK}
        </Button>
        {isLastStep ? (
          <Button appearance="primary" onClick={handleCreate} disabled={!canProceed() || isLoading}>
            {isLoading ? (
              <div className={styles.loadingSpinner}>
                <Spinner size="tiny" />
                {intlText.CREATING}
              </div>
            ) : (
              intlText.CREATE
            )}
          </Button>
        ) : (
          <Button appearance="primary" onClick={handleNext} disabled={!canProceed() || isLoading}>
            {intlText.NEXT}
          </Button>
        )}
      </div>
    </div>
  );
};
