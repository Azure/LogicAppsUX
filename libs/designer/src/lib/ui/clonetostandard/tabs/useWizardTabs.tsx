import { useIntl } from 'react-intl';
import { configureTab } from './configuretab';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/clonetostandard/store';
import { reviewTab } from './reviewtab';
import { useCallback, useMemo } from 'react';
import {
  setSuccessfullyCloned,
  updateTargetWorkflowNameValidationError,
  updateErrorMessage,
} from '../../../core/state/clonetostandard/cloneslice';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';
import { validateWorkflowName } from '../../../core/actions/bjsworkflow/templates';
import { useExistingWorkflowNamesOfResource } from '../../../core';
import { selectWizardTab } from '../../../core/state/clonetostandard/tabslice';
import constants from '../../../common/constants';

export type CloneCallHandler = (
  sourceApps: { subscriptionId: string; resourceGroup: string; logicAppName: string; targetWorkflowName: string }[],
  destinationApp: { subscriptionId: string; resourceGroup: string; logicAppName: string }
) => Promise<void>;

export const useCloneWizardTabs = ({
  onCloneCall,
  onClose,
}: {
  onCloneCall: CloneCallHandler;
  onClose: () => void;
}) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const {
    clone: { sourceApps, destinationApp, errorMessage, isSuccessfullyCloned },
  } = useSelector((state: RootState) => state);

  const { data: existingWorkflowNames } = useExistingWorkflowNamesOfResource(
    destinationApp.subscriptionId,
    destinationApp.resourceGroup,
    destinationApp.logicAppName
  );

  const handleOnConfigureNext = useCallback(async () => {
    // Note: temporary while only supporting single case, to-be-changed once supporting multi.
    const validationError = await validateWorkflowName(sourceApps?.[0]?.targetWorkflowName, false, {
      subscriptionId: sourceApps?.[0]?.subscriptionId,
      resourceGroupName: sourceApps?.[0]?.resourceGroup,
      existingWorkflowNames: existingWorkflowNames ?? [],
    });
    dispatch(updateTargetWorkflowNameValidationError(validationError));

    if (validationError) {
      return;
    }
    dispatch(selectWizardTab(constants.CLONE_TO_STANDARD_TAB_NAMES.REVIEW));
  }, [sourceApps, dispatch, existingWorkflowNames]);

  const handleOnClone = useCallback(async () => {
    try {
      await onCloneCall(sourceApps, destinationApp);
      dispatch(setSuccessfullyCloned());
    } catch (e: any) {
      dispatch(updateErrorMessage(e?.response?.data?.message ?? e.message));
    }
  }, [onCloneCall, sourceApps, destinationApp, dispatch]);

  const missingInfoInConfigure = useMemo(
    () =>
      sourceApps.length < 1 ||
      sourceApps.some((app) => !app.logicAppName) ||
      sourceApps.some((app) => !isUndefinedOrEmptyString(app.targetWorkflowNameValidationError)) ||
      !destinationApp.subscriptionId ||
      !destinationApp.resourceGroup ||
      !destinationApp.logicAppName,
    [sourceApps, destinationApp]
  );

  const failedCloneValidation = useMemo(() => !isUndefinedOrEmptyString(errorMessage), [errorMessage]);

  return [
    configureTab(intl, {
      tabStatusIcon: missingInfoInConfigure ? undefined : 'success',
      onClose,
      disabled: isSuccessfullyCloned,
      isPrimaryButtonDisabled: missingInfoInConfigure,
      onPrimaryButtonClick: handleOnConfigureNext,
    }),
    reviewTab(intl, dispatch, {
      tabStatusIcon: failedCloneValidation ? 'error' : isSuccessfullyCloned ? 'success' : undefined,
      onClose,
      isSuccessfullyCloned,
      disabled: missingInfoInConfigure,
      isPrimaryButtonDisabled: failedCloneValidation || isSuccessfullyCloned,
      onPrimaryButtonClick: handleOnClone,
    }),
  ];
};
