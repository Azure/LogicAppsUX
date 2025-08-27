import { useIntl } from 'react-intl';
import { configureTab } from './configuretab';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/clonetostandard/store';
import { reviewTab } from './reviewtab';
import { useCallback, useMemo } from 'react';
import { updateErrorMessage } from '../../../core/state/clonetostandard/cloneslice';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';

export type CloneCallHandler = (
  sourceApps: { subscriptionId: string; resourceGroup: string; logicAppName: string }[],
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
    clone: { sourceApps, destinationApp, errorMessage },
  } = useSelector((state: RootState) => state);

  const handleOnClone = useCallback(async () => {
    try {
      await onCloneCall(sourceApps, destinationApp);
    } catch (e: any) {
      dispatch(updateErrorMessage(e?.response?.data?.message ?? e.message));
    }
  }, [onCloneCall, sourceApps, destinationApp, dispatch]);

  const missingInfoInConfigure = useMemo(
    () =>
      sourceApps.length < 1 ||
      sourceApps.some((app) => !app.logicAppName) ||
      sourceApps.some((app) => !isUndefinedOrEmptyString(app.clonedWorkflowNameValidationError)) ||
      !destinationApp.subscriptionId ||
      !destinationApp.resourceGroup ||
      !destinationApp.logicAppName,
    [sourceApps, destinationApp]
  );

  const failedCloneValidation = useMemo(() => !isUndefinedOrEmptyString(errorMessage), [errorMessage]);

  return [
    configureTab(intl, dispatch, {
      tabStatusIcon: missingInfoInConfigure ? undefined : 'success',
      onCancel: onClose,
      isPrimaryButtonDisabled: missingInfoInConfigure,
    }),
    reviewTab(intl, dispatch, {
      tabStatusIcon: failedCloneValidation ? 'error' : undefined,
      onClone: handleOnClone,
      disabled: missingInfoInConfigure,
      isPrimaryButtonDisabled: failedCloneValidation,
    }),
  ];
};
