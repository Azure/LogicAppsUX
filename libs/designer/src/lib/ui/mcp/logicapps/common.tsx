import {
  useId,
  Toaster,
  useToastController,
  ToastTitle,
  Toast,
  ToastBody,
  type ToastPosition,
  type ToastPoliteness,
} from '@fluentui/react-components';
import type { TemplatesSectionItem } from '@microsoft/designer-ui';
import { useLocation, useSubscription } from '../../../core/queries/resource';
import type { RootState } from '../../../core/state/mcp/store';
import { useMemo, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const useDefaultSettingsItems = () => {
  const intl = useIntl();
  const { subscriptionId, resourceGroup, location, appPlan } = useSelector((state: RootState) => ({
    subscriptionId: state.mcpOptions.resourceDetails?.subscriptionId,
    resourceGroup: state.mcpOptions.resourceDetails?.resourceGroup,
    location: state.mcpOptions.resourceDetails?.location,
    appPlan: state.resource.newLogicAppDetails?.appServicePlan,
  }));
  const { data: subscription } = useSubscription(subscriptionId ?? '');
  const { data: locationData } = useLocation(subscriptionId ?? '', location ?? '');

  const intlTexts = {
    subscriptionLabel: intl.formatMessage({
      defaultMessage: 'Subscription',
      id: 'hzJ613',
      description: 'Label for the subscription field',
    }),
    resourceGroupLabel: intl.formatMessage({
      defaultMessage: 'Resource group',
      id: 'ahz1UW',
      description: 'Label for the resource group field',
    }),
    regionLabel: intl.formatMessage({
      defaultMessage: 'Region',
      id: '9LJG/a',
      description: 'Label for the region field',
    }),
    pricingPlanLabel: intl.formatMessage({
      defaultMessage: 'Pricing plan',
      id: '7zzSoZ',
      description: 'Label for the pricing plan field',
    }),
    publicAccessLabel: intl.formatMessage({
      defaultMessage: 'Public access',
      id: 'LGUiVk',
      description: 'Label for the public access field',
    }),
    publicAccessValue: intl.formatMessage({
      defaultMessage: 'On',
      id: '+tCJ2g',
      description: 'Value for the public access field when enabled',
    }),
    loadingText: intl.formatMessage({
      defaultMessage: 'Loading...',
      id: 'jWLEVz',
      description: 'Loading text shown while fetching data',
    }),
  };
  return useMemo(() => {
    return [
      {
        label: intlTexts.subscriptionLabel,
        value: subscription?.displayName ?? intlTexts.loadingText,
        type: 'text',
      },
      {
        label: intlTexts.resourceGroupLabel,
        value: resourceGroup,
        type: 'text',
      },
      {
        label: intlTexts.regionLabel,
        value: locationData?.displayName ?? intlTexts.loadingText,
        type: 'text',
      },
      {
        label: intlTexts.pricingPlanLabel,
        value: getPricingPlanValue(appPlan?.sku ?? ''),
        type: 'text',
      },
      {
        label: intlTexts.publicAccessLabel,
        value: intlTexts.publicAccessValue,
        type: 'text',
      },
    ] as TemplatesSectionItem[];
  }, [
    appPlan?.sku,
    intlTexts.loadingText,
    intlTexts.pricingPlanLabel,
    intlTexts.publicAccessLabel,
    intlTexts.publicAccessValue,
    intlTexts.regionLabel,
    intlTexts.resourceGroupLabel,
    intlTexts.subscriptionLabel,
    locationData?.displayName,
    resourceGroup,
    subscription?.displayName,
  ]);
};

const getPricingPlanValue = (sku: string) => {
  switch (sku) {
    case 'WS1':
      return 'Workflow Standard (WS1): 210 total ACU, 3.5 GB memory, 1 vCPU';
    case 'WS2':
      return 'Workflow Standard (WS2): 420 total ACU, 7 GB memory, 2 vCPU';
    case 'WS3':
      return 'Workflow Standard (WS3): 840 total ACU, 14 GB memory, 4 vCPU';
    default:
      return '---';
  }
};

export const SuccessToast = ({ show }: { show: boolean }): JSX.Element => {
  const intl = useIntl();
  const appName = useSelector((state: RootState) => state.resource.newLogicAppDetails?.appName);
  const toasterId = useId('mcp-info-toaster');
  const { dispatchToast } = useToastController(toasterId);
  const resources = {
    title: intl.formatMessage({
      defaultMessage: 'Logic app created',
      id: 'TG23yI',
      description: 'Title for the success toast when a Logic App is created',
    }),
    body: intl.formatMessage(
      {
        defaultMessage: 'Your logic app "{appName}" has been created successfully.',
        id: 'tqjQ3P',
        description: 'Body for the success toast when a Logic App is created',
      },
      { appName }
    ),
  };

  useEffect(() => {
    if (show) {
      dispatchToast(
        <Toast>
          <ToastTitle>{resources.title}</ToastTitle>
          <ToastBody style={{ paddingTop: 12, marginLeft: '-18px', fontSize: 'small' }}>{resources.body}</ToastBody>
        </Toast>,
        {
          intent: 'success',
          timeout: 10000,
          position: 'top-end' as ToastPosition,
          politeness: 'polite' as ToastPoliteness,
          toastId: toasterId,
        }
      );
    }
  }, [dispatchToast, resources.body, resources.title, show, toasterId]);

  return <Toaster toasterId={toasterId} offset={{ horizontal: 30, vertical: -10 }} />;
};
