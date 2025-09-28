import { useMemo, useCallback, useState } from 'react';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import type { McpPanelTabProps } from '@microsoft/designer-ui';
import constants from '../../../../common/constants';
import { quickBasicsTab } from './tabs/quickbasics';
import { quickReviewTab } from './tabs/quickreview';
import { delay, equals, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import {
  type ArmTemplate,
  createLogicAppFromTemplate,
  pollForAppCreateCompletion,
  validateAndCreateAppPayload,
} from '../../../../core/mcp/utils/logicapp';
import { type LogicAppConfigDetails, setLogicApp, setNewLogicAppDetails } from '../../../../core/state/mcp/resourceSlice';
import { closePanel, selectPanelTab } from '../../../../core/state/mcp/panel/mcpPanelSlice';

export const useCreateAppPanelTabs = (onCreateApp: () => void): McpPanelTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const { newLogicAppDetails, subscriptionId, resourceGroup, location } = useSelector((state: RootState) => ({
    currentPanelView: state.mcpPanel.currentPanelView,
    subscriptionId: state.mcpOptions.resourceDetails?.subscriptionId,
    resourceGroup: state.mcpOptions.resourceDetails?.resourceGroup,
    location: state.mcpOptions.resourceDetails?.location,
    newLogicAppDetails: state.resource.newLogicAppDetails,
  }));

  const intlTexts = {
    createButtonText: intl.formatMessage({
      defaultMessage: 'Review + create',
      id: 'COKUSs',
      description: 'Button text for creating the logic app',
    }),
    validationErrorTitle: intl.formatMessage({
      defaultMessage: 'Validation failed',
      id: 'KKBCUX',
      description: 'Title shown when there is an error in the template',
    }),
    createErrorTitle: intl.formatMessage({
      defaultMessage: 'Creation failed',
      id: 'fLchIJ',
      description: 'Title for the error message shown when creation of logic app fails',
    }),
  };

  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string } | undefined>(undefined);
  const [isValidating, setIsValidating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [templatePayload, setTemplatePayload] = useState<{ deploymentName: string; template: ArmTemplate } | undefined>(undefined);
  const [resourcesStatus, setResourcesStatus] = useState<Record<string, string>>({});
  const [createButtonText, setCreateButtonText] = useState<string>(intlTexts.createButtonText);

  const updateResourcesStatus = useCallback((statuses: Record<string, string>) => {
    setResourcesStatus((prevStatuses) => ({ ...prevStatuses, ...statuses }));
  }, []);

  const validateCreatePayload = useCallback(async () => {
    if (newLogicAppDetails?.isValid) {
      setIsValidating(true);
      const { isValid, errorMessage, deploymentName, template } = await validateAndCreateAppPayload({
        ...newLogicAppDetails,
        subscriptionId: subscriptionId as string,
        resourceGroup: resourceGroup as string,
        location: location as string,
      });
      setIsValidating(false);
      setErrorInfo(
        errorMessage
          ? { title: intlTexts.validationErrorTitle, message: errorMessage }
          : isValid
            ? undefined
            : {
                title: intlTexts.validationErrorTitle,
                message: intl.formatMessage({
                  defaultMessage: 'Failed to validate the logic app details. Please check your selections.',
                  id: 'Pa1oRq',
                  description: 'Error message shown when validation of new logic app details fails',
                }),
              }
      );
      setShowValidationErrors(true);

      if (isValid) {
        setTemplatePayload({ deploymentName: deploymentName as string, template: template as ArmTemplate });
      }
    } else {
      LoggerService().log({
        level: LogEntryLevel.Warning,
        area: 'MCP.CreateLogicApp',
        message: 'Possible bug: New logic app details are invalid and was able to navigate to review tab',
        error: new Error('Bug: New logic app details are invalid'),
      });
      dispatch(
        setNewLogicAppDetails({
          errorMessage: intl.formatMessage({
            defaultMessage: 'Please fill all required fields and then continue.',
            id: 'gkwo0O',
            description: 'Error message shown when required fields are not filled in new logic app details',
          }),
        })
      );
      return;
    }
  }, [dispatch, intl, intlTexts.validationErrorTitle, location, newLogicAppDetails, resourceGroup, subscriptionId]);

  const handleMoveToReview = useCallback(() => {
    if (isCreated) {
      dispatch(selectPanelTab(constants.MCP_PANEL_TAB_NAMES.QUICK_REVIEW));
      return;
    }

    setShowValidationErrors(true);
    setResourcesStatus(getResourcesToBeCreated(newLogicAppDetails));
    if (newLogicAppDetails?.isValid) {
      validateCreatePayload();
      dispatch(selectPanelTab(constants.MCP_PANEL_TAB_NAMES.QUICK_REVIEW));
    } else {
      LoggerService().log({
        level: LogEntryLevel.Warning,
        area: 'MCP.CreateLogicApp',
        message: 'Possible bug: New logic app details are invalid and was able to navigate to review tab',
        error: new Error('Bug: New logic app details are invalid'),
      });
    }
  }, [dispatch, isCreated, newLogicAppDetails, validateCreatePayload]);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    setCreateButtonText(
      intl.formatMessage({
        defaultMessage: 'Submitting...',
        id: '3wBpcJ',
        description: 'Button text while submitting the deployment of the logic app.',
      })
    );

    try {
      const deploymentUri = await createLogicAppFromTemplate(
        templatePayload?.deploymentName as string,
        templatePayload?.template as ArmTemplate,
        subscriptionId as string,
        resourceGroup as string
      );

      dispatch(setNewLogicAppDetails({ createStatus: 'inprogress' }));
      setResourcesStatus(
        Object.keys(resourcesStatus).reduce((acc: Record<string, string>, resource: string) => {
          acc[resource] = equals(resourcesStatus[resource], 'notstarted') ? 'running' : resourcesStatus[resource];
          return acc;
        }, {})
      );
      setCreateButtonText(
        intl.formatMessage({
          defaultMessage: 'Creating...',
          id: 'Cx7E/L',
          description: 'Button text while creating the logic app.',
        })
      );

      const resourcesToBeCreated = Object.values(resourcesStatus).filter(
        (status) => equals(status, 'notstarted') || equals(status, 'running')
      ).length;
      const errorDetails = await pollForAppCreateCompletion(deploymentUri as string, resourcesToBeCreated, updateResourcesStatus);

      if (errorDetails) {
        dispatch(setNewLogicAppDetails({ createStatus: 'failed' }));
        setErrorInfo({ title: intlTexts.createErrorTitle, message: errorDetails.message });
        setIsCreating(false);
        setCreateButtonText(intlTexts.createButtonText);
      } else {
        setIsCreated(true);
        dispatch(
          setLogicApp({
            resourceGroup: resourceGroup as string,
            location: location as string,
            logicAppName: newLogicAppDetails?.appName as string,
            isNew: true,
          })
        );

        await delay(11000); // Delay to let the user see the created status and progress bar completion

        dispatch(closePanel());
        onCreateApp();
      }
    } catch (error: any) {
      setIsCreating(false);
      setCreateButtonText(intlTexts.createButtonText);
      setErrorInfo({ title: intlTexts.createErrorTitle, message: error.message });
    }
  }, [
    dispatch,
    intl,
    intlTexts.createButtonText,
    intlTexts.createErrorTitle,
    location,
    newLogicAppDetails?.appName,
    onCreateApp,
    resourceGroup,
    resourcesStatus,
    subscriptionId,
    templatePayload?.deploymentName,
    templatePayload?.template,
    updateResourcesStatus,
  ]);

  const isCreateDisabled = useMemo(() => !newLogicAppDetails?.isValid, [newLogicAppDetails?.isValid]);

  const quickBasicsTabItem = useMemo(
    () =>
      quickBasicsTab(intl, dispatch, showValidationErrors, {
        isTabDisabled: false,
        isPrimaryButtonDisabled: isCreateDisabled,
        onPrimaryButtonClick: handleMoveToReview,
        tabStatusIcon: showValidationErrors && newLogicAppDetails?.isValid === false ? 'error' : undefined,
      }),
    [intl, dispatch, isCreateDisabled, handleMoveToReview, showValidationErrors, newLogicAppDetails?.isValid]
  );

  const quickReviewTabItem = useMemo(
    () =>
      quickReviewTab(
        intl,
        dispatch,
        createButtonText,
        {
          isValidating: isValidating,
          isCreated,
          resourcesStatus,
          errorInfo,
        },
        {
          onTabClick: handleMoveToReview,
          isTabDisabled: isCreateDisabled,
          isPrimaryButtonDisabled: isCreateDisabled || isCreating || isValidating,
          isSecondaryButtonDisabled: isCreating || isValidating,
          previousTabId: constants.MCP_PANEL_TAB_NAMES.QUICK_BASICS,
          onPrimaryButtonClick: handleCreate,
        }
      ),
    [
      intl,
      dispatch,
      createButtonText,
      isValidating,
      isCreated,
      resourcesStatus,
      errorInfo,
      handleMoveToReview,
      isCreateDisabled,
      isCreating,
      handleCreate,
    ]
  );

  return useMemo(() => [quickBasicsTabItem, quickReviewTabItem], [quickBasicsTabItem, quickReviewTabItem]);
};

const getResourcesToBeCreated = (details: LogicAppConfigDetails | undefined) => {
  if (!details) {
    return {};
  }

  const newResources: Record<string, string> = { logicapp: 'notstarted' };
  const existingResources: Record<string, string> = {};

  if (details.appServicePlan?.isNew) {
    newResources['appserviceplan'] = 'notstarted';
  } else {
    existingResources['appserviceplan'] = 'existing';
  }

  if (details.storageAccount?.isNew) {
    newResources['storageaccount'] = 'notstarted';
  } else {
    existingResources['storageaccount'] = 'existing';
  }

  if (details.appInsights?.isNew) {
    newResources['appinsights'] = 'notstarted';
  } else if (details.appInsights?.id) {
    existingResources['appinsights'] = 'existing';
  }

  return { ...newResources, ...existingResources };
};
