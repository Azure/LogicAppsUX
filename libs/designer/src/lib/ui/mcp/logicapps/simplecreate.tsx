import { useIntl } from 'react-intl';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { DescriptionWithLink, ErrorBar } from '../../configuretemplate/common';
import { useCallback, useMemo, useState } from 'react';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { getResourceNameFromId, ResourceService } from '@microsoft/logic-apps-shared';
import { AppPlanSelector } from './resources/appplanselector';
import { StorageAccountSelector } from './resources/storageselector';
import { AppInsightsSelector } from './resources/appinsightsselector';
import { type LogicAppConfigDetails, setNewLogicAppDetails } from '../../../core/state/mcp/resourceSlice';
import { useCreateDetailsStyles } from './styles';
import { useDefaultSettingsItems } from './common';

export const SimpleCreate = ({ showValidationErrors }: { showValidationErrors: boolean }) => {
  const styles = useCreateDetailsStyles();
  const intl = useIntl();
  const intlTexts = {
    description: intl.formatMessage({
      defaultMessage:
        'Quickly create a resource with the recommended defaults. For full setup, switch to Advanced create, or edit the advanced settings later, if necessary.',
      id: 'jW06l2',
      description: 'Description for creating a simple logic app',
    }),
    linkText: intl.formatMessage({
      defaultMessage: 'Compare Quick create and Advanced create',
      id: 'go/NOM',
      description: 'Link text for learning more about logic apps create views',
    }),
    defaultSettingsTitle: intl.formatMessage({
      defaultMessage: 'Default settings',
      id: 'JCmWdL',
      description: 'Title for the default settings section',
    }),
    detailsSectionTitle: intl.formatMessage({
      defaultMessage: 'Logic app details',
      id: '7l+m8P',
      description: 'Title for the details section',
    }),
    errorTitle: intl.formatMessage({
      defaultMessage: 'Validation errors',
      id: '7FKm7o',
      description: 'Title for the validation errors bar',
    }),
    errorDescription: intl.formatMessage({
      defaultMessage: 'Please fix the errors and try again.',
      id: 'm+/AXv',
      description: 'Description for the validation errors bar',
    }),
  };
  const defaultSettingsSectionItems = useDefaultSettingsItems();
  const detailsSectionItems = useDetailsSectionItems();
  const newLogicAppDetails = useSelector((state: RootState) => state.resource.newLogicAppDetails);

  return (
    <div className={styles.container}>
      <DescriptionWithLink
        text={intlTexts.description}
        linkText={intlTexts.linkText}
        linkUrl="https://docs.microsoft.com/en-us/azure/logic-apps/logic-apps-overview"
      />

      {showValidationErrors && (!newLogicAppDetails?.isValid || newLogicAppDetails?.errorMessage) ? (
        <ErrorBar
          title={intlTexts.errorTitle}
          errorMessage={newLogicAppDetails?.errorMessage ?? intlTexts.errorDescription}
          styles={{ marginLeft: '-1px' }}
        />
      ) : null}
      <br />
      <TemplatesSection
        title={intlTexts.defaultSettingsTitle}
        titleHtmlFor={'defaultSettingsSectionLabel'}
        items={defaultSettingsSectionItems}
      />
      <TemplatesSection title={intlTexts.detailsSectionTitle} titleHtmlFor={'detailsSectionLabel'} items={detailsSectionItems} />
    </div>
  );
};

const useDetailsSectionItems = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const intlTexts = {
    nameLabel: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'ZRKh2Q',
      description: 'Label for the name field',
    }),
    appServicePlanLabel: intl.formatMessage({
      defaultMessage: 'App Service plan',
      id: 'kH7x1w',
      description: 'Label for the App Service plan field',
    }),
    storageAccountLabel: intl.formatMessage({
      defaultMessage: 'Storage account',
      id: '5HY9F4',
      description: 'Label for the storage account field',
    }),
    appInsightsLabel: intl.formatMessage({
      defaultMessage: 'Application Insights workspace',
      id: 'J1rO4z',
      description: 'Label for the Application Insights field',
    }),
    networkLabel: intl.formatMessage({
      defaultMessage: 'Network public access',
      id: 'X7dlrL',
      description: 'Label for the Network field',
    }),
    virtualNetworkLabel: intl.formatMessage({
      defaultMessage: 'Virtual network integration',
      id: 'kkx2qd',
      description: 'Label for the Virtual network field',
    }),
  };

  const { subscriptionId, appServicePlan, storageAccount, appInsights, logicAppName, isValid } = useSelector((state: RootState) => ({
    subscriptionId: state.mcpOptions.resourceDetails?.subscriptionId,
    appServicePlan: state.resource.newLogicAppDetails?.appServicePlan ?? { id: '', sku: '', isNew: false },
    storageAccount: state.resource.newLogicAppDetails?.storageAccount ?? { id: '' },
    appInsights: state.resource.newLogicAppDetails?.appInsights ?? { id: '' },
    logicAppName: state.resource.newLogicAppDetails?.appName ?? '',
    isValid: state.resource.newLogicAppDetails?.isValid,
  }));
  const [appErrorMessage, setAppErrorMessage] = useState<string | undefined>(undefined);
  const handleAppNameBlur = useCallback(async () => {
    const availabilityError = await validateAvailability(logicAppName, subscriptionId ?? '');
    setAppErrorMessage(availabilityError);

    const isNewValid = !!appServicePlan?.id && !!storageAccount?.id && !availabilityError;
    dispatch(setNewLogicAppDetails({ isValid: isNewValid }));
  }, [subscriptionId, logicAppName, appServicePlan?.id, storageAccount?.id, dispatch]);

  const setConfigUpdate = useCallback(
    (details: Partial<LogicAppConfigDetails>) => {
      const isNewValid = details.appServicePlan
        ? !!details.appServicePlan?.id
        : details.storageAccount
          ? !!details.storageAccount?.id
          : isValid;
      dispatch(setNewLogicAppDetails({ ...details, isValid: isNewValid }));
    },
    [dispatch, isValid]
  );

  return useMemo(
    () =>
      [
        {
          label: intlTexts.nameLabel,
          value: logicAppName,
          type: 'textfield',
          onChange: (value: string) => setConfigUpdate({ appName: value }),
          onBlur: handleAppNameBlur,
          errorMessage: appErrorMessage,
          required: true,
          description: intl.formatMessage({
            defaultMessage: 'The name of the Logic App',
            id: 'UOv1L6',
            description: 'Description for the Logic App name field',
          }),
        },
        {
          label: intlTexts.appServicePlanLabel,
          value: appServicePlan?.id,
          type: 'custom',
          required: true,
          onRenderItem: () => (
            <AppPlanSelector
              selectedResource={appServicePlan?.id}
              setSelectedResource={(id: string, sku: string) => setConfigUpdate({ appServicePlan: { id, sku } })}
              newResourceName={appServicePlan?.isNew ? getResourceNameFromId(appServicePlan.id) : undefined}
              setNewResource={(id) => setConfigUpdate({ appServicePlan: { id, isNew: true, sku: 'WS1' } })}
            />
          ),
        },
        {
          label: intlTexts.storageAccountLabel,
          value: storageAccount?.id,
          type: 'custom',
          required: true,
          onRenderItem: () => (
            <StorageAccountSelector
              selectedResource={storageAccount?.id}
              setSelectedResource={(id: string) => setConfigUpdate({ storageAccount: { id } })}
              newResourceName={storageAccount?.isNew ? getResourceNameFromId(storageAccount.id) : undefined}
              setNewResource={(id) => setConfigUpdate({ storageAccount: { id, isNew: true } })}
            />
          ),
        },
        {
          label: intlTexts.appInsightsLabel,
          value: appInsights?.id,
          type: 'custom',
          onRenderItem: () => (
            <AppInsightsSelector
              selectedResource={appInsights?.id}
              setSelectedResource={(id: string) => setConfigUpdate({ appInsights: { id } })}
              newResourceName={appInsights?.isNew ? getResourceNameFromId(appInsights.id) : undefined}
              setNewResource={(id) => setConfigUpdate({ appInsights: { id, isNew: true } })}
            />
          ),
        },
      ] as TemplatesSectionItem[],
    [
      appErrorMessage,
      appInsights.id,
      appInsights?.isNew,
      appServicePlan.id,
      appServicePlan?.isNew,
      handleAppNameBlur,
      intl,
      intlTexts.appInsightsLabel,
      intlTexts.appServicePlanLabel,
      intlTexts.nameLabel,
      intlTexts.storageAccountLabel,
      logicAppName,
      setConfigUpdate,
      storageAccount.id,
      storageAccount?.isNew,
    ]
  );
};

const validateAvailability = async (name: string, subscriptionId: string): Promise<string | undefined> => {
  const result = await ResourceService().executeResourceAction(
    `/subscriptions/${subscriptionId}/providers/Microsoft.Web/checknameavailability`,
    'POST',
    { 'api-version': '2018-11-01' },
    { isFQDN: true, name: `${name}.azurewebsites.net`, type: 'Site' }
  );
  return result.message;
};
