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
    clone: { sourceApps, destinationApp },
  } = useSelector((state: RootState) => state);

  const handleOnClone = useCallback(async () => {
    try {
      await onCloneCall(sourceApps, destinationApp);
    } catch (e: any) {
      dispatch(updateErrorMessage(e?.response?.data?.message ?? e.message));
    }
  }, [onCloneCall, sourceApps, destinationApp, dispatch]);

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
