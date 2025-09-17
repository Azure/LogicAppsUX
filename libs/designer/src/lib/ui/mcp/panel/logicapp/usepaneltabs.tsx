import { useMemo, useCallback, useState } from 'react';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import type { McpPanelTabProps } from '@microsoft/designer-ui';
import constants from '../../../../common/constants';
import { quickBasicsTab } from './tabs/quickbasics';
import { quickReviewTab } from './tabs/quickreview';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { selectPanelTab } from '../../../../core/state/templates/panelSlice';
import { type ArmTemplate, validateAndCreateAppPayload } from '../../../../core/mcp/utils/logicapp';
import { setNewLogicAppDetails } from '../../../../core/state/mcp/resourceSlice';

export const useCreateAppPanelTabs = (): McpPanelTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const { newLogicAppDetails, subscriptionId, resourceGroup, location } = useSelector((state: RootState) => ({
    currentPanelView: state.mcpPanel.currentPanelView,
    subscriptionId: state.mcpOptions.resourceDetails?.subscriptionId,
    resourceGroup: state.mcpOptions.resourceDetails?.resourceGroup,
    location: state.mcpOptions.resourceDetails?.location,
    newLogicAppDetails: state.resource.newLogicAppDetails,
  }));

  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isValidating, setIsValidating] = useState(false);
  const [templatePayload, setTemplatePayload] = useState<{ deploymentName: string; template: ArmTemplate } | undefined>(undefined);

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
      setErrorMessage(
        errorMessage ??
          (isValid
            ? undefined
            : intl.formatMessage({
                defaultMessage: 'Failed to validate the logic app details. Please check your selections.',
                id: 'Pa1oRq',
                description: 'Error message shown when validation of new logic app details fails',
              }))
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
  }, [dispatch, intl, location, newLogicAppDetails, resourceGroup, subscriptionId]);

  const handleMoveToReview = useCallback(() => {
    setShowValidationErrors(true);
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
  }, [dispatch, newLogicAppDetails?.isValid, validateCreatePayload]);

  const handleCreate = useCallback(() => {
    window.alert('Will be creating the logic app now');
  }, []);

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
        {
          isValidating: isValidating,
          template: templatePayload?.template,
          errorMessage,
        },
        {
          onTabClick: handleMoveToReview,
          isTabDisabled: isCreateDisabled,
          isPrimaryButtonDisabled: isCreateDisabled,
          previousTabId: constants.MCP_PANEL_TAB_NAMES.QUICK_BASICS,
          onPrimaryButtonClick: handleCreate,
        }
      ),
    [intl, dispatch, isValidating, templatePayload?.template, errorMessage, handleMoveToReview, isCreateDisabled, handleCreate]
  );

  return useMemo(() => [quickBasicsTabItem, quickReviewTabItem], [quickBasicsTabItem, quickReviewTabItem]);
};
