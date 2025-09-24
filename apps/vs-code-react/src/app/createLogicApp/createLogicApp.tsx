import type { OutletContext } from '../../run-service';
import { useCreateWorkspaceStyles } from '../createWorkspace/createWorkspaceStyles';
import { useIntl } from 'react-intl';
import { useOutletContext } from 'react-router-dom';
import { ReviewCreateStep } from '../createWorkspace/steps/';
import { Button, Spinner, Text } from '@fluentui/react-components';
import { VSCodeContext } from '../../webviewCommunication';
import type { RootState } from '../../state/store';
import type { CreateWorkspaceState } from '../../state/createWorkspace/createWorkspaceSlice';
import { nextStep, previousStep, setCurrentStep, setFlowType } from '../../state/createWorkspace/createWorkspaceSlice';
import { useContext, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CreateLogicAppSetupStep } from './createLogicAppSetupStep';
// Import validation patterns for navigation blocking
import { logicAppNameValidation } from '../createWorkspace/steps/logicAppTypeStep';
import { workflowNameValidation } from '../createWorkspace/steps/workflowTypeStepAlt';
import { functionNameValidation, namespaceValidation } from '../createWorkspace/steps/dotNetFrameworkStep';

export const CreateLogicApp: React.FC = () => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const dispatch = useDispatch();
  const styles = useCreateWorkspaceStyles();

  const createWorkspaceState = useSelector((state: RootState) => state.createWorkspace) as CreateWorkspaceState;
  const {
    currentStep,
    isLoading,
    isComplete,
    error,
    workspaceProjectPath,
    workspaceName,
    logicAppType,
    functionWorkspace,
    functionName,
    workflowType,
    workflowName,
    targetFramework,
    logicAppName,
    projectType,
    workspaceFileJson,
    logicAppsWithoutCustomCode,
  } = createWorkspaceState;

  // Set flow type when component mounts
  useEffect(() => {
    dispatch(setFlowType('createLogicApp'));
  }, [dispatch]);

  // Calculate total steps - now just 2: Project Setup and Review + Create
  const totalSteps = 2;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const intlText = {
    CREATE_LOGICAPP: intl.formatMessage({
      defaultMessage: 'Create logic app',
      id: 'xKrgfN',
      description: 'Create logic app workspace text.',
    }),
    CREATE_BUTTON: intl.formatMessage({
      defaultMessage: 'Create logic app',
      id: 'I6GRRs',
      description: 'Create logic app button',
    }),
    CREATING: intl.formatMessage({
      defaultMessage: 'Creating...',
      id: 'k6MqI+',
      description: 'Creating workspace in progress',
    }),
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
    LOGICAPP_CREATED: intl.formatMessage({
      defaultMessage: 'Logic App Created Successfully!',
      id: '8bXaOe',
      description: 'Logic app creation success message',
    }),
    LOGICAPP_CREATED_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Your logic app has been created and is ready to use.',
      id: 'ECHpxE',
      description: 'Logic app creation success description',
    }),
    // Step labels - only 2 steps now
    STEP_PROJECT_SETUP: intl.formatMessage({
      defaultMessage: 'Logic App Setup',
      id: 'dELTC6',
      description: 'Logic App setup step label',
    }),
    STEP_REVIEW_CREATE: intl.formatMessage({
      defaultMessage: 'Review + Create',
      id: '4dze5/',
      description: 'Review and create step label',
    }),
  };

  // Helper function to check if a name already exists in workspace folders
  const isNameAlreadyInWorkspace = (name: string): boolean => {
    return workspaceFileJson?.folders && workspaceFileJson.folders.some((folder: { name: string }) => folder.name === name);
  };

  // Helper function to validate logic app name with support for existing logic apps
  const validateLogicAppNameForNavigation = (name: string): boolean => {
    if (!name.trim() || !logicAppNameValidation.test(name.trim())) {
      return false;
    }

    // If custom code or rules engine is selected and the name is from the existing logic apps list, it's valid
    const isCustomCodeOrRulesEngine = logicAppType === 'customCode' || logicAppType === 'rulesEngine';
    const isExistingLogicApp = logicAppsWithoutCustomCode?.some((app: { label: string }) => app.label === name);

    if (isCustomCodeOrRulesEngine && isExistingLogicApp) {
      return true; // Valid - existing logic app for custom code/rules engine
    }

    // Check for workspace folder collision (only if not using existing logic app)
    return !isNameAlreadyInWorkspace(name.trim());
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: {
        // Project Setup - validate all required fields are present AND properly formatted
        const logicAppTypeValid = logicAppType !== '';
        const logicAppNameValid = validateLogicAppNameForNavigation(logicAppName);

        // Check if an existing logic app is selected
        const isCustomCodeOrRulesEngine = logicAppType === 'customCode' || logicAppType === 'rulesEngine';
        const isExistingLogicApp = logicAppsWithoutCustomCode?.some((app: { label: string }) => app.label === logicAppName);
        const usingExistingLogicApp = isCustomCodeOrRulesEngine && isExistingLogicApp;

        // If using existing logic app, don't validate workflow fields
        const workflowTypeValid = usingExistingLogicApp || workflowType !== '';
        const workflowNameValid = usingExistingLogicApp || (workflowName.trim() !== '' && workflowNameValidation.test(workflowName.trim()));

        const baseFieldsValid = logicAppTypeValid && logicAppNameValid && workflowTypeValid && workflowNameValid;

        // If custom code is selected, also validate custom code fields (required even for existing logic apps)
        if (logicAppType === 'customCode') {
          const targetFrameworkValid = targetFramework !== '';
          const functionWorkspaceValid = functionWorkspace.trim() !== '' && namespaceValidation.test(functionWorkspace.trim());
          const functionNameValid =
            functionName.trim() !== '' &&
            functionNameValidation.test(functionName.trim()) &&
            !isNameAlreadyInWorkspace(functionName.trim());

          return baseFieldsValid && targetFrameworkValid && functionWorkspaceValid && functionNameValid;
        }

        // If rules engine is selected, validate function fields but not .NET framework (required even for existing logic apps)
        if (logicAppType === 'rulesEngine') {
          const functionWorkspaceValid = functionWorkspace.trim() !== '' && namespaceValidation.test(functionWorkspace.trim());
          const functionNameValid =
            functionName.trim() !== '' &&
            functionNameValidation.test(functionName.trim()) &&
            !isNameAlreadyInWorkspace(functionName.trim());

          return baseFieldsValid && functionWorkspaceValid && functionNameValid;
        }

        return baseFieldsValid;
      }
      case 1: {
        // Review + Create - all fields should already be validated
        return true;
      }
      default:
        return false;
    }
  };

  const getStepLabels = () => {
    return [intlText.STEP_PROJECT_SETUP, intlText.STEP_REVIEW_CREATE];
  };

  const isStepCompleted = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: {
        // Project Setup step - validate all required fields with regex validation
        const logicAppTypeValid = logicAppType !== '';
        const logicAppNameValid = validateLogicAppNameForNavigation(logicAppName);

        // Check if an existing logic app is selected
        const isCustomCodeOrRulesEngine = logicAppType === 'customCode' || logicAppType === 'rulesEngine';
        const isExistingLogicApp = logicAppsWithoutCustomCode?.some((app: { label: string }) => app.label === logicAppName);
        const usingExistingLogicApp = isCustomCodeOrRulesEngine && isExistingLogicApp;

        // If using existing logic app, don't validate workflow fields
        const workflowTypeValid = usingExistingLogicApp || workflowType !== '';
        const workflowNameValid = usingExistingLogicApp || (workflowName.trim() !== '' && workflowNameValidation.test(workflowName.trim()));

        const baseFieldsValid = logicAppTypeValid && logicAppNameValid && workflowTypeValid && workflowNameValid;

        // If custom code is selected, also validate custom code fields (required even for existing logic apps)
        if (logicAppType === 'customCode') {
          const targetFrameworkValid = targetFramework !== '';
          const functionWorkspaceValid = functionWorkspace.trim() !== '' && namespaceValidation.test(functionWorkspace.trim());
          const functionNameValid = functionName.trim() !== '' && functionNameValidation.test(functionName.trim());

          return baseFieldsValid && targetFrameworkValid && functionWorkspaceValid && functionNameValid;
        }

        // If rules engine is selected, validate function fields but not .NET framework (required even for existing logic apps)
        if (logicAppType === 'rulesEngine') {
          const functionWorkspaceValid = functionWorkspace.trim() !== '' && namespaceValidation.test(functionWorkspace.trim());
          const functionNameValid = functionName.trim() !== '' && functionNameValidation.test(functionName.trim());

          return baseFieldsValid && functionWorkspaceValid && functionNameValid;
        }

        return baseFieldsValid;
      }
      case 1:
        // Review + Create step - considered complete if we can create
        return isStepCompleted(0); // Depends on previous step being complete
      default:
        return false;
    }
  };

  const canNavigateToStep = (stepIndex: number) => {
    // Can always navigate to current or previous steps
    if (stepIndex <= currentStep) {
      return true;
    }

    // For future steps, check if all intermediate steps can be completed
    for (let i = currentStep; i < stepIndex; i++) {
      if (!isStepCompleted(i)) {
        return false;
      }
    }

    return true;
  };

  const handleStepClick = (stepIndex: number) => {
    if (canNavigateToStep(stepIndex) && !isLoading) {
      dispatch(setCurrentStep(stepIndex));
    }
  };

  const renderStepNavigation = () => {
    const stepLabels = getStepLabels();

    return (
      <div className={styles.stepNavigation}>
        {stepLabels.map((label, index) => {
          const isActive = index === currentStep;
          const isCompleted = isStepCompleted(index);
          const canNavigate = canNavigateToStep(index);

          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                className={`${styles.stepItem} ${isActive ? styles.stepItemActive : ''} ${canNavigate ? '' : styles.stepItemDisabled}`}
                onClick={() => handleStepClick(index)}
              >
                <div className={`${styles.stepNumber} ${isActive ? styles.stepNumberActive : ''}`}>
                  {isCompleted && !isActive ? '✓' : index + 1}
                </div>
                <div className={styles.stepLabel}>{label}</div>
              </div>
              {index < stepLabels.length - 1 && (
                <div className={`${styles.stepConnector} ${isCompleted ? styles.stepConnectorCompleted : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    );
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

  const handleCreate = () => {
    const data = {
      workspaceProjectPath,
      workspaceName,
      logicAppType,
      logicAppName,
      workflowType,
      workflowName,
      targetFramework,
      projectType,
      ...(logicAppType === 'customCode' && {
        functionWorkspace,
        functionName,
      }),
      ...(logicAppType === 'rulesEngine' && {
        functionWorkspace,
        functionName,
      }),
    };
    vscode.postMessage({ command: 'createLogicApp', data });
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <CreateLogicAppSetupStep />;
      case 1:
        return <ReviewCreateStep />;
      default:
        return <CreateLogicAppSetupStep />;
    }
  };

  if (isComplete) {
    return (
      <div className={styles.createWorkspaceContainer}>
        <div className={styles.completionMessage}>
          <Text style={{ display: 'block' }}>{intlText.LOGICAPP_CREATED}</Text>
          <Text style={{ display: 'block' }}>{intlText.LOGICAPP_CREATED_DESCRIPTION}</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.createWorkspaceContainer}>
      <Text className={styles.createWorkspaceTitle} style={{ display: 'block' }}>
        {intlText.CREATE_LOGICAPP}
      </Text>

      {renderStepNavigation()}

      <div className={styles.createWorkspaceContent}>
        {renderCurrentStep()}

        {error && <div className={styles.errorMessage}>{error}</div>}
      </div>

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
                intlText.CREATE_BUTTON
              )}
            </Button>
          ) : (
            <Button appearance="primary" onClick={handleNext} disabled={!canProceed() || isLoading}>
              {intlText.NEXT}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export function useOutlet() {
  return useOutletContext<OutletContext>();
}
