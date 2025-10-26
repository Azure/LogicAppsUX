import type { OutletContext } from '../../run-service';
import { useCreateWorkspaceStyles } from './createWorkspaceStyles';
import { useIntl } from 'react-intl';
import { useOutletContext } from 'react-router-dom';
import { ProjectSetupStep, PackageSetupStep, ReviewCreateStep, WorkspaceNameStep } from './steps/';
import { CreateLogicAppSetupStep } from '../createLogicApp/createLogicAppSetupStep';
import { Button, Spinner, Text } from '@fluentui/react-components';
import { VSCodeContext } from '../../webviewCommunication';
import type { RootState } from '../../state/store';
import type { CreateWorkspaceState } from '../../state/createWorkspaceSlice';
import { nextStep, previousStep, setCurrentStep, setFlowType } from '../../state/createWorkspaceSlice';
import { useContext, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// Import validation patterns and functions for navigation blocking
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { getValidationRequirements, nameValidation } from './utils/validation';

export const CreateWorkspace: React.FC = () => {
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
    flowType,
    packagePath,
    workspaceProjectPath,
    workspaceName,
    logicAppType,
    functionFolderName,
    functionNamespace,
    functionName,
    workflowType,
    workflowName,
    targetFramework,
    logicAppName,
    projectType,
    workspaceFileJson,
    pathValidationResults,
    workspaceExistenceResults,
    packageValidationResults,
    logicAppsWithoutCustomCode,
    separator,
  } = createWorkspaceState;

  // Set flow type when component mounts
  useEffect(() => {
    dispatch(setFlowType('createWorkspace'));
  }, [dispatch]);

  // Calculate total steps - always 2: Setup and Review + Create
  const totalSteps = 2;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Helper function to get flow-specific messages
  const getCreateWorkspaceMessage = () => {
    switch (flowType) {
      case 'createWorkspaceFromPackage':
        return intl.formatMessage({
          defaultMessage: 'Create logic app workspace from package',
          id: 'RZZxs+',
          description: 'Create logic app workspace from package text.',
        });
      case 'convertToWorkspace':
        return intl.formatMessage({
          defaultMessage: 'Create logic app workspace',
          id: 'eagv8j',
          description: 'Create logic app workspace text.',
        });
      case 'createLogicApp':
        return intl.formatMessage({
          defaultMessage: 'Create Project',
          id: 'RmJRES',
          description: 'Create logic app project text.',
        });
      default:
        return intl.formatMessage({
          defaultMessage: 'Create logic app workspace',
          id: 'eagv8j',
          description: 'Create logic app workspace text.',
        });
    }
  };

  const getCreateButtonMessage = () => {
    if (flowType === 'createLogicApp') {
      return intl.formatMessage({
        defaultMessage: 'Create project',
        id: 'u+VFmh',
        description: 'Create logic app project button',
      });
    }
    return intl.formatMessage({
      defaultMessage: 'Create workspace',
      id: '+u2tgz',
      description: 'Create workspace button',
    });
  };

  const getCreatingMessage = () => {
    if (flowType === 'createWorkspaceFromPackage') {
      return intl.formatMessage({
        defaultMessage: 'Creating...',
        id: 'e8iBzO',
        description: 'Creating workspace from package in progress',
      });
    }
    return intl.formatMessage({
      defaultMessage: 'Creating...',
      id: 'k6MqI+',
      description: 'Creating workspace in progress',
    });
  };

  const getSuccessTitle = () => {
    switch (flowType) {
      case 'createWorkspaceFromPackage':
        return intl.formatMessage({
          defaultMessage: 'Workspace From Package Created Successfully!',
          id: 'vDfUt4',
          description: 'Workspace from package creation success message',
        });
      case 'convertToWorkspace':
      case 'createLogicApp':
        return intl.formatMessage({
          defaultMessage: 'Logic App Created Successfully!',
          id: '8bXaOe',
          description: 'Logic app creation success message',
        });
      default:
        return intl.formatMessage({
          defaultMessage: 'Workspace Created Successfully!',
          id: '4fdozy',
          description: 'Workspace creation success message',
        });
    }
  };

  const getSuccessDescription = () => {
    switch (flowType) {
      case 'createWorkspaceFromPackage':
        return intl.formatMessage({
          defaultMessage: 'Your logic app workspace from package has been created is ready to use.',
          id: 'rGWwuB',
          description: 'Workspace package creation success description',
        });
      case 'convertToWorkspace':
      case 'createLogicApp':
        return intl.formatMessage({
          defaultMessage: 'Your logic app has been created and is ready to use.',
          id: 'ECHpxE',
          description: 'Logic app creation success description',
        });
      default:
        return intl.formatMessage({
          defaultMessage: 'Your logic app workspace has been created and is ready to use.',
          id: 'OdrYKo',
          description: 'Workspace creation success description',
        });
    }
  };

  const getProjectSetupStepLabel = () => {
    if (flowType === 'convertToWorkspace' || flowType === 'createLogicApp') {
      return intl.formatMessage({
        defaultMessage: 'Logic App Setup',
        id: 'dELTC6',
        description: 'Logic App setup step label',
      });
    }
    return intl.formatMessage({
      defaultMessage: 'Project Setup',
      id: '1d8W/S',
      description: 'Project setup step label',
    });
  };

  const intlText = {
    CREATE_WORKSPACE: getCreateWorkspaceMessage(),
    CREATE_BUTTON: getCreateButtonMessage(),
    CREATING: getCreatingMessage(),
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
    SUCCESS_TITLE: getSuccessTitle(),
    SUCCESS_DESCRIPTION: getSuccessDescription(),
    STEP_PROJECT_SETUP: getProjectSetupStepLabel(),
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
    if (!name.trim() || !nameValidation.test(name.trim())) {
      return false;
    }

    // If custom code or rules engine is selected and the name is from the existing logic apps list, it's valid
    const isCustomCodeOrRulesEngine = logicAppType === ProjectType.customCode || logicAppType === ProjectType.rulesEngine;
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
        const requirements = getValidationRequirements(flowType, logicAppType);

        // Package path validation (only for createWorkspaceFromPackage)
        if (requirements.needsPackagePath) {
          const packagePathValid = packagePath.fsPath !== '' && packageValidationResults[packagePath.fsPath] === true;
          if (!packagePathValid) {
            return false;
          }
        }

        // Workspace path validation (not needed for createLogicApp)
        if (requirements.needsWorkspacePath) {
          const workspacePathValid = workspaceProjectPath.fsPath !== '' && pathValidationResults[workspaceProjectPath.fsPath] === true;
          if (!workspacePathValid) {
            return false;
          }
        }

        // Workspace name validation (not needed for createLogicApp)
        if (requirements.needsWorkspaceName) {
          const workspaceFolder = `${workspaceProjectPath.fsPath}${separator}${workspaceName}`;
          const workspaceNameValid =
            workspaceName.trim() !== '' && nameValidation.test(workspaceName.trim()) && workspaceExistenceResults[workspaceFolder] !== true;
          if (!workspaceNameValid) {
            return false;
          }
        }

        // Logic app type validation
        if (requirements.needsLogicAppType) {
          const logicAppTypeValid = logicAppType !== '';
          if (!logicAppTypeValid) {
            return false;
          }
        }

        // Logic app name validation
        if (requirements.needsLogicAppName) {
          const logicAppNameValid =
            flowType === 'createLogicApp'
              ? validateLogicAppNameForNavigation(logicAppName)
              : logicAppName.trim() !== '' && nameValidation.test(logicAppName.trim()) && !isNameAlreadyInWorkspace(logicAppName.trim());
          if (!logicAppNameValid) {
            return false;
          }
        }

        // Workflow fields validation
        if (requirements.needsWorkflowFields) {
          // For createLogicApp, check if using existing logic app
          if (flowType === 'createLogicApp') {
            const isCustomCodeOrRulesEngine = logicAppType === ProjectType.customCode || logicAppType === ProjectType.rulesEngine;
            const isExistingLogicApp = logicAppsWithoutCustomCode?.some((app: { label: string }) => app.label === logicAppName);
            const usingExistingLogicApp = isCustomCodeOrRulesEngine && isExistingLogicApp;

            if (!usingExistingLogicApp) {
              const workflowTypeValid = workflowType !== '';
              const workflowNameValid = workflowName.trim() !== '' && nameValidation.test(workflowName.trim());
              if (!workflowTypeValid || !workflowNameValid) {
                return false;
              }
            }
          } else {
            // For other flows, always validate workflow fields
            const workflowTypeValid = workflowType !== '';
            const workflowNameValid =
              workflowName.trim() !== '' && nameValidation.test(workflowName.trim()) && !isNameAlreadyInWorkspace(workflowName.trim());
            if (!workflowTypeValid || !workflowNameValid) {
              return false;
            }
          }
        }

        // Function fields validation (for custom code and rules engine)
        if (requirements.needsFunctionFields) {
          // Function folder name validation
          const functionFolderNameValid =
            functionFolderName.trim() !== '' &&
            nameValidation.test(functionFolderName.trim()) &&
            !isNameAlreadyInWorkspace(functionFolderName.trim()) &&
            functionFolderName.trim().toLowerCase() !== logicAppName.trim().toLowerCase();
          if (!functionFolderNameValid) {
            return false;
          }
          const functionNamespaceValid = functionNamespace.trim() !== '' && nameValidation.test(functionNamespace.trim());
          const functionNameValid = functionName.trim() !== '' && nameValidation.test(functionName.trim());

          if (!functionNamespaceValid || !functionNameValid) {
            return false;
          }

          // Target framework validation (only for custom code)
          if (logicAppType === ProjectType.customCode) {
            const targetFrameworkValid = targetFramework !== '';
            if (!targetFrameworkValid) {
              return false;
            }
          }
        }

        return true;
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
        // Project Setup step - validate all required fields based on flow type
        const requirements = getValidationRequirements(flowType, logicAppType);

        // For convertToWorkspace, only validate workspace path and name
        if (flowType === 'convertToWorkspace') {
          const workspacePathValid = workspaceProjectPath.fsPath !== '' && pathValidationResults[workspaceProjectPath.fsPath] === true;
          const workspaceFolder = `${workspaceProjectPath.fsPath}${separator}${workspaceName}`;
          const workspaceNameValid =
            workspaceName.trim() !== '' && nameValidation.test(workspaceName.trim()) && workspaceExistenceResults[workspaceFolder] !== true;
          return workspacePathValid && workspaceNameValid;
        }

        // For other flow types, use the full validation
        const workspacePathValid = requirements.needsWorkspacePath
          ? workspaceProjectPath.fsPath !== '' && pathValidationResults[workspaceProjectPath.fsPath] === true
          : true;
        const workspaceFolder = `${workspaceProjectPath.fsPath}${separator}${workspaceName}`;
        const workspaceNameValid = requirements.needsWorkspaceName
          ? workspaceName.trim() !== '' && nameValidation.test(workspaceName.trim()) && workspaceExistenceResults[workspaceFolder] !== true
          : true;
        const logicAppTypeValid = requirements.needsLogicAppType ? logicAppType !== '' : true;
        const logicAppNameValid = requirements.needsLogicAppName
          ? logicAppName.trim() !== '' && nameValidation.test(logicAppName.trim()) && !isNameAlreadyInWorkspace(logicAppName.trim())
          : true;
        const workflowTypeValid = requirements.needsWorkflowFields ? workflowType !== '' : true;
        const workflowNameValid = requirements.needsWorkflowFields
          ? workflowName.trim() !== '' && nameValidation.test(workflowName.trim()) && !isNameAlreadyInWorkspace(workflowName.trim())
          : true;

        const baseFieldsValid =
          workspacePathValid && workspaceNameValid && logicAppTypeValid && logicAppNameValid && workflowTypeValid && workflowNameValid;

        // If function fields are needed, validate them
        if (requirements.needsFunctionFields) {
          const functionFolderNameValid =
            functionFolderName.trim() !== '' &&
            nameValidation.test(functionFolderName.trim()) &&
            !isNameAlreadyInWorkspace(functionFolderName.trim()) &&
            functionFolderName.trim().toLowerCase() !== logicAppName.trim().toLowerCase();
          const functionNamespaceValid = functionNamespace.trim() !== '' && nameValidation.test(functionNamespace.trim());
          const functionNameValid = functionName.trim() !== '' && nameValidation.test(functionName.trim());

          const functionFieldsValid = functionNamespaceValid && functionNameValid && functionFolderNameValid;

          // Custom code additionally requires target framework
          if (logicAppType === ProjectType.customCode) {
            const targetFrameworkValid = targetFramework !== '';
            return baseFieldsValid && functionFieldsValid && targetFrameworkValid;
          }

          // Rules engine doesn't need target framework
          return baseFieldsValid && functionFieldsValid;
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
    const baseData = {
      workspaceProjectPath,
      workspaceName,
      projectType,
    };

    // Add flow-specific data
    let data: any = { ...baseData };

    if (flowType === 'createWorkspaceFromPackage') {
      data = {
        ...data,
        packagePath,
        logicAppType,
        logicAppName,
      };
    } else if (flowType === 'convertToWorkspace') {
      data = {
        ...data,
        logicAppType,
        logicAppName,
        workflowType,
        workflowName,
        targetFramework,
        ...(logicAppType === ProjectType.customCode && {
          functionFolderName,
          functionNamespace,
          functionName,
        }),
        ...(logicAppType === ProjectType.rulesEngine && {
          functionFolderName,
          functionNamespace,
          functionName,
        }),
      };
    } else if (flowType === 'createLogicApp') {
      data = {
        workspaceProjectPath,
        workspaceName,
        logicAppType,
        logicAppName,
        workflowType,
        workflowName,
        targetFramework,
        projectType,
        ...(logicAppType === ProjectType.customCode && {
          functionNamespace,
          functionName,
          functionFolderName,
        }),
        ...(logicAppType === ProjectType.rulesEngine && {
          functionNamespace,
          functionName,
          functionFolderName,
        }),
      };
    } else {
      // createWorkspace
      data = {
        ...data,
        logicAppType,
        logicAppName,
        workflowType,
        workflowName,
        targetFramework,
        ...(logicAppType === ProjectType.customCode && {
          functionFolderName,
          functionNamespace,
          functionName,
        }),
        ...(logicAppType === ProjectType.rulesEngine && {
          functionFolderName,
          functionNamespace,
          functionName,
        }),
      };
    }

    // Send the appropriate command based on flow type
    const command =
      flowType === 'createWorkspaceFromPackage'
        ? 'createWorkspaceFromPackage'
        : flowType === 'convertToWorkspace'
          ? 'createWorkspaceStructure'
          : flowType === 'createLogicApp'
            ? 'createLogicApp'
            : 'createWorkspace';

    vscode.postMessage({ command, data });
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: {
        // Render different setup steps based on flow type
        if (flowType === 'createWorkspaceFromPackage') {
          return <PackageSetupStep />;
        }
        if (flowType === 'convertToWorkspace') {
          return (
            <div className={styles.formSection}>
              <WorkspaceNameStep />
            </div>
          );
        }
        if (flowType === 'createLogicApp') {
          return <CreateLogicAppSetupStep />;
        }
        return <ProjectSetupStep />;
      }
      case 1:
        return <ReviewCreateStep />;
      default: {
        // Default to first step based on flow type
        if (flowType === 'createWorkspaceFromPackage') {
          return <PackageSetupStep />;
        }
        if (flowType === 'convertToWorkspace') {
          return (
            <div className={styles.formSection}>
              <WorkspaceNameStep />
            </div>
          );
        }
        if (flowType === 'createLogicApp') {
          return <CreateLogicAppSetupStep />;
        }
        return <ProjectSetupStep />;
      }
    }
  };

  if (isComplete) {
    return (
      <div className={styles.createWorkspaceContainer}>
        <div className={styles.completionMessage}>
          <Text style={{ display: 'block' }}>{intlText.SUCCESS_TITLE}</Text>
          <Text style={{ display: 'block' }}>{intlText.SUCCESS_DESCRIPTION}</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.createWorkspaceContainer}>
      <Text className={styles.createWorkspaceTitle}>{intlText.CREATE_WORKSPACE}</Text>

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

// Separate components for each flow type that set their flowType
export const CreateWorkspaceFromPackage: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setFlowType('createWorkspaceFromPackage'));
  }, [dispatch]);

  return <CreateWorkspace />;
};

export const CreateWorkspaceStructure: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setFlowType('convertToWorkspace'));
  }, [dispatch]);

  return <CreateWorkspace />;
};

export const CreateLogicApp: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setFlowType('createLogicApp'));
  }, [dispatch]);

  return <CreateWorkspace />;
};

export function useOutlet() {
  return useOutletContext<OutletContext>();
}
