import { useIntl } from 'react-intl';
import { configureTab } from './configuretab';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/clonetostandard/store';
import { reviewTab } from './reviewtab';
import { useCallback } from 'react';
import { updateErrorMessage } from '../../../core/state/clonetostandard/cloneslice';

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
    resource: { subscriptionId },
    clone: {
      sourceApps,
      destinationApp: { resourceGroup: destResourceGroup, logicAppName: destLogicAppName },
    },
  } = useSelector((state: RootState) => state);

  const handleOnClone = useCallback(async () => {
    try {
      await onCloneCall(sourceApps, {
        subscriptionId,
        resourceGroup: destResourceGroup,
        logicAppName: destLogicAppName,
      });
    } catch (e: any) {
      dispatch(updateErrorMessage(e?.response?.data?.message ?? e.message));
    }
  }, [onCloneCall, subscriptionId, sourceApps, destResourceGroup, destLogicAppName, dispatch]);

  return [
    configureTab(intl, dispatch, {
      tabStatusIcon: undefined,
      onCancel: onClose,
    }),
    reviewTab(intl, dispatch, {
      tabStatusIcon: undefined,
      onClone: handleOnClone,
    }),
  ];
};
