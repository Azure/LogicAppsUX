import type { RootState } from '../../state/store';
import {
  setSelectedSubscription,
  setSelectedLogicApp,
  setIsCreatingNew,
  setNewLogicAppName,
  setSelectedResourceGroup,
  setNewResourceGroupName,
  setSelectedLocation,
  setResourceGroups,
  setLocations,
  setSelectedAppServicePlan,
  setNewAppServicePlanName,
  setSelectedAppServicePlanSku,
  setSelectedStorageAccount,
  setNewStorageAccountName,
  setCreateAppInsights,
  setNewAppInsightsName,
  setDeploying,
} from '../../state/deploySlice';
import { useSelector, useDispatch } from 'react-redux';
import { useDeployStyles } from './deployStyles';
import { Button, Dropdown, Option, Spinner, Text, Input, Label, Checkbox } from '@fluentui/react-components';
import { VSCodeContext } from '../../webviewCommunication';
import { useContext, useMemo, useEffect, useState } from 'react';
import { ApiService } from '../../run-service/export';
import type { ISubscription } from '../../run-service';
import { QueryKeys } from '../../run-service';
import { useQuery } from '@tanstack/react-query';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useIntlMessages, deployMessages } from '../../intl';

export const DeployApp: React.FC = () => {
  const vscode = useContext(VSCodeContext);
  const dispatch = useDispatch();
  const styles = useDeployStyles();
  const intlText = useIntlMessages(deployMessages);

  const [isCheckingStorageName, setIsCheckingStorageName] = useState(false);
  const [storageNameUnavailable, setStorageNameUnavailable] = useState(false);
  const [storageNameMessage, setStorageNameMessage] = useState('');

  const deployState = useSelector((state: RootState) => state.deploy);
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { baseUrl, accessToken, cloudHost } = workflowState;

  const {
    selectedSubscription,
    selectedLogicApp,
    selectedLogicAppName,
    selectedResourceGroup,
    isCreatingNew,
    newLogicAppName,
    newResourceGroupName,
    isCreatingNewResourceGroup,
    selectedLocation,
    selectedAppServicePlan,
    newAppServicePlanName,
    isCreatingNewAppServicePlan,
    selectedAppServicePlanSku,
    selectedStorageAccount,
    newStorageAccountName,
    isCreatingNewStorageAccount,
    createAppInsights,
    newAppInsightsName,
    appInsightsNameManuallyChanged,
    isDeploying,
    deploymentStatus,
    deploymentMessage,
    error,
  } = deployState;

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
      cloudHost,
      vscodeContext: vscode,
    });
  }, [accessToken, baseUrl, cloudHost, vscode]);

  const { data: subscriptionsList, isLoading: isSubscriptionsLoading } = useQuery<ISubscription[]>(
    [QueryKeys.subscriptionData],
    () => apiService.getSubscriptions(),
    {
      refetchOnWindowFocus: false,
      enabled: accessToken !== undefined,
      retry: 4,
    }
  );

  const {
    data: logicAppsList,
    isLoading: isLogicAppsLoading,
    refetch: refetchLogicApps,
  } = useQuery<any[]>(
    [QueryKeys.resourceGroupsData, { subscriptionId: selectedSubscription }],
    () => apiService.getLogicApps(selectedSubscription),
    {
      refetchOnWindowFocus: false,
      enabled: !!selectedSubscription,
      retry: 4,
    }
  );

  const {
    data: resourceGroupsList,
    isLoading: isResourceGroupsLoading,
    refetch: refetchResourceGroups,
  } = useQuery<Array<{ name: string; location: string }>>(
    [QueryKeys.resourceGroupsData, 'rgs', { subscriptionId: selectedSubscription }],
    () => apiService.getResourceGroups(selectedSubscription),
    {
      refetchOnWindowFocus: false,
      enabled: !!selectedSubscription && isCreatingNew,
      retry: 4,
    }
  );

  const {
    data: locationsList,
    isLoading: isLocationsLoading,
    refetch: refetchLocations,
  } = useQuery<Array<{ name: string; displayName: string }>>(
    [QueryKeys.resourceGroupsData, 'locations', { subscriptionId: selectedSubscription }],
    () => apiService.getLocations(selectedSubscription),
    {
      refetchOnWindowFocus: false,
      enabled: !!selectedSubscription && isCreatingNew,
      retry: 4,
    }
  );

  // Fetch all app service plans once for the subscription
  const { data: allAppServicePlans = [], isLoading: isAppServicePlansLoading } = useQuery<any[]>(
    [QueryKeys.resourceGroupsData, 'appServicePlans', { subscriptionId: selectedSubscription }],
    () => apiService.getAppServicePlans(selectedSubscription),
    {
      refetchOnWindowFocus: false,
      enabled: !!selectedSubscription && isCreatingNew,
      retry: 4,
    }
  );

  // Fetch all storage accounts once for the subscription
  const { data: allStorageAccounts = [], isLoading: isStorageAccountsLoading } = useQuery<
    Array<{ id: string; name: string; location: string }>
  >(
    [QueryKeys.resourceGroupsData, 'storageAccounts', { subscriptionId: selectedSubscription }],
    () => apiService.getStorageAccounts(selectedSubscription),
    {
      refetchOnWindowFocus: false,
      enabled: !!selectedSubscription && isCreatingNew,
      retry: 4,
    }
  );

  // Filter app service plans by selected location and WorkflowStandard tier
  const appServicePlansList = useMemo(
    () => allAppServicePlans.filter((plan) => plan.location === selectedLocation && plan.sku?.tier === 'WorkflowStandard'),
    [allAppServicePlans, selectedLocation]
  );

  // Filter storage accounts by selected location
  const storageAccountsList = useMemo(
    () => allStorageAccounts.filter((storage) => storage.location === selectedLocation),
    [allStorageAccounts, selectedLocation]
  );

  useEffect(() => {
    if (selectedSubscription) {
      refetchLogicApps();
    }
  }, [selectedSubscription, refetchLogicApps]);

  useEffect(() => {
    if (selectedSubscription && isCreatingNew) {
      refetchResourceGroups();
      refetchLocations();
    }
  }, [selectedSubscription, isCreatingNew, refetchResourceGroups, refetchLocations]);

  useEffect(() => {
    if (resourceGroupsList) {
      dispatch(setResourceGroups(resourceGroupsList));
    }
  }, [resourceGroupsList, dispatch]);

  useEffect(() => {
    if (locationsList) {
      dispatch(setLocations(locationsList));
    }
  }, [locationsList, dispatch]);

  // Generate resource names based on Logic App name
  useEffect(() => {
    if (newLogicAppName && isCreatingNew) {
      // Generate a simple GUID-like suffix
      const generateGuid = () => {
        return Math.random().toString(36).substring(2, 10);
      };

      const guid = generateGuid();

      // App Service Plan: ASP-{logicappname}-{guid}
      if (isCreatingNewAppServicePlan) {
        const aspName = `ASP-${newLogicAppName}-${guid}`;
        dispatch(setNewAppServicePlanName(aspName));
      }

      // Storage Account: lowercase alphanumeric only, max 24 chars
      if (isCreatingNewStorageAccount) {
        const storageName = `${newLogicAppName.toLowerCase().replace(/[^a-z0-9]/g, '')}${guid}`.substring(0, 24);
        dispatch(setNewStorageAccountName(storageName));
      }

      // App Insights: same as Logic App name (only update if not manually changed)
      if (createAppInsights && !appInsightsNameManuallyChanged) {
        dispatch(setNewAppInsightsName(newLogicAppName));
      }
    }
  }, [
    newLogicAppName,
    isCreatingNew,
    isCreatingNewAppServicePlan,
    isCreatingNewStorageAccount,
    createAppInsights,
    appInsightsNameManuallyChanged,
    dispatch,
  ]);

  // Check if logic app name already exists
  const logicAppNameExists = useMemo(() => {
    if (!newLogicAppName || !isCreatingNew || !logicAppsList) {
      return false;
    }
    return logicAppsList.some((app) => app.name.toLowerCase() === newLogicAppName.toLowerCase());
  }, [newLogicAppName, isCreatingNew, logicAppsList]);

  // Check if app service plan name already exists
  const appServicePlanNameExists = useMemo(() => {
    if (!newAppServicePlanName || !isCreatingNew || !isCreatingNewAppServicePlan || !allAppServicePlans) {
      return false;
    }
    return allAppServicePlans.some((plan) => plan.name.toLowerCase() === newAppServicePlanName.toLowerCase());
  }, [newAppServicePlanName, isCreatingNew, isCreatingNewAppServicePlan, allAppServicePlans]);

  // Validate Logic App name (1-43 chars, alphanumeric and hyphens only)
  // Note: Despite Azure docs listing more characters, Logic Apps Standard only accepts alphanumerics and hyphens
  const logicAppNameError = useMemo(() => {
    if (!newLogicAppName || !isCreatingNew) {
      return '';
    }
    if (newLogicAppName.length < 1 || newLogicAppName.length > 43) {
      return intlText.LOGIC_APP_NAME_LENGTH_ERROR;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(newLogicAppName)) {
      return intlText.LOGIC_APP_NAME_CHARS_ERROR;
    }
    return '';
  }, [newLogicAppName, isCreatingNew, intlText]);

  // Validate App Service Plan name (1-60 chars, alphanumeric/hyphens, cannot start/end with hyphen)
  const appServicePlanNameError = useMemo(() => {
    if (!newAppServicePlanName || !isCreatingNew || !isCreatingNewAppServicePlan) {
      return '';
    }
    if (newAppServicePlanName.length < 1 || newAppServicePlanName.length > 60) {
      return intlText.APP_SERVICE_PLAN_NAME_LENGTH_ERROR;
    }
    if (newAppServicePlanName.startsWith('-') || newAppServicePlanName.endsWith('-')) {
      return intlText.APP_SERVICE_PLAN_NAME_HYPHEN_ERROR;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(newAppServicePlanName)) {
      return intlText.APP_SERVICE_PLAN_NAME_CHARS_ERROR;
    }
    return '';
  }, [newAppServicePlanName, isCreatingNew, isCreatingNewAppServicePlan, intlText]);

  // Validate Storage Account name (3-24 chars, lowercase letters/numbers only)
  const storageAccountNameError = useMemo(() => {
    if (!newStorageAccountName || !isCreatingNew || !isCreatingNewStorageAccount) {
      return '';
    }
    if (newStorageAccountName.length < 3 || newStorageAccountName.length > 24) {
      return intlText.STORAGE_ACCOUNT_NAME_LENGTH_ERROR;
    }
    if (!/^[a-z0-9]+$/.test(newStorageAccountName)) {
      return intlText.STORAGE_ACCOUNT_NAME_CHARS_ERROR;
    }
    return '';
  }, [newStorageAccountName, isCreatingNew, isCreatingNewStorageAccount, intlText]);

  // Check storage account name availability (debounced)
  useEffect(() => {
    if (!newStorageAccountName || !isCreatingNew || !isCreatingNewStorageAccount || !selectedSubscription || storageAccountNameError) {
      setStorageNameUnavailable(false);
      setStorageNameMessage('');
      return;
    }

    setIsCheckingStorageName(true);
    const timeoutId = setTimeout(async () => {
      try {
        const result = await apiService.checkStorageAccountNameAvailability(selectedSubscription, newStorageAccountName);
        setStorageNameUnavailable(!result.available);
        setStorageNameMessage(result.message || '');
      } catch (error) {
        console.error('Error checking storage account name availability:', error);
      } finally {
        setIsCheckingStorageName(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [newStorageAccountName, isCreatingNew, isCreatingNewStorageAccount, selectedSubscription, storageAccountNameError, apiService]);

  // Check storage account name availability (debounced)
  useEffect(() => {
    if (!newStorageAccountName || !isCreatingNew || !isCreatingNewStorageAccount || !selectedSubscription || storageAccountNameError) {
      setStorageNameUnavailable(false);
      setStorageNameMessage('');
      return;
    }

    setIsCheckingStorageName(true);
    const timeoutId = setTimeout(async () => {
      try {
        const result = await apiService.checkStorageAccountNameAvailability(selectedSubscription, newStorageAccountName);
        setStorageNameUnavailable(!result.available);
        setStorageNameMessage(result.message || '');
      } catch (error) {
        console.error('Error checking storage account name availability:', error);
      } finally {
        setIsCheckingStorageName(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [newStorageAccountName, isCreatingNew, isCreatingNewStorageAccount, selectedSubscription, storageAccountNameError, apiService]);

  const handleSubscriptionChange = (_event: any, data: any) => {
    if (data.optionValue) {
      dispatch(setSelectedSubscription(data.optionValue));
    }
  };

  const handleLogicAppChange = (_event: any, data: any) => {
    if (data.optionValue) {
      if (data.optionValue === '__CREATE_NEW__') {
        dispatch(setIsCreatingNew(true));
      } else {
        const selectedApp = logicAppsList?.find((app) => app.id === data.optionValue);
        if (selectedApp) {
          dispatch(
            setSelectedLogicApp({
              id: selectedApp.id,
              name: selectedApp.name,
              resourceGroup: selectedApp.resourceGroup,
            })
          );
        }
      }
    }
  };

  const handleNewLogicAppNameChange = (_event: any, data: any) => {
    dispatch(setNewLogicAppName(data.value));
  };

  const handleResourceGroupChange = (_event: any, data: any) => {
    if (data.optionValue) {
      dispatch(setSelectedResourceGroup(data.optionValue));
    }
  };

  const handleNewResourceGroupNameChange = (_event: any, data: any) => {
    dispatch(setNewResourceGroupName(data.value));
  };

  const handleLocationChange = (_event: any, data: any) => {
    if (data.optionValue) {
      dispatch(setSelectedLocation(data.optionValue));
    }
  };

  const handleAppServicePlanChange = (_event: any, data: any) => {
    if (data.optionValue) {
      dispatch(setSelectedAppServicePlan(data.optionValue));
    }
  };

  const handleNewAppServicePlanNameChange = (_event: any, data: any) => {
    dispatch(setNewAppServicePlanName(data.value));
  };

  const handleAppServicePlanSkuChange = (_event: any, data: any) => {
    if (data.optionValue) {
      dispatch(setSelectedAppServicePlanSku(data.optionValue));
    }
  };

  const handleStorageAccountChange = (_event: any, data: any) => {
    if (data.optionValue) {
      dispatch(setSelectedStorageAccount(data.optionValue));
    }
  };

  const handleNewStorageAccountNameChange = (_event: any, data: any) => {
    dispatch(setNewStorageAccountName(data.value));
  };

  const handleCreateAppInsightsChange = (_event: any, data: any) => {
    dispatch(setCreateAppInsights(data.checked));
  };

  const handleDeploy = () => {
    if (isCreatingNew) {
      // Creating a new Logic App
      if (!newLogicAppName || !selectedLocation) {
        return;
      }

      const finalResourceGroup = isCreatingNewResourceGroup ? newResourceGroupName : selectedResourceGroup;
      if (!finalResourceGroup) {
        return;
      }

      const finalAppServicePlan = isCreatingNewAppServicePlan ? newAppServicePlanName : selectedAppServicePlan;
      if (!finalAppServicePlan && !isCreatingNewAppServicePlan) {
        return;
      }

      const finalStorageAccount = isCreatingNewStorageAccount ? newStorageAccountName : selectedStorageAccount;
      if (!finalStorageAccount && !isCreatingNewStorageAccount) {
        return;
      }

      dispatch(setDeploying(true));

      vscode.postMessage({
        command: ExtensionCommand.deploy,
        data: {
          subscriptionId: selectedSubscription,
          createNew: true,
          newLogicAppName,
          resourceGroup: finalResourceGroup,
          isCreatingNewResourceGroup,
          location: selectedLocation,
          appServicePlan: finalAppServicePlan,
          isCreatingNewAppServicePlan,
          appServicePlanSku: selectedAppServicePlanSku,
          storageAccount: finalStorageAccount,
          isCreatingNewStorageAccount,
          createAppInsights,
          appInsightsName: createAppInsights ? newAppInsightsName : undefined,
        },
      });
    } else {
      // Deploying to existing Logic App
      if (!selectedLogicApp) {
        return;
      }

      dispatch(setDeploying(true));

      vscode.postMessage({
        command: ExtensionCommand.deploy,
        data: {
          subscriptionId: selectedSubscription,
          logicAppId: selectedLogicApp,
          logicAppName: selectedLogicAppName,
          resourceGroup: selectedResourceGroup,
        },
      });
    }
  };

  const handleCancel = () => {
    vscode.postMessage({
      command: ExtensionCommand.cancel_deploy,
    });
  };

  const canDeploy = isCreatingNew
    ? selectedSubscription &&
      newLogicAppName &&
      !logicAppNameExists &&
      !logicAppNameError &&
      !appServicePlanNameExists &&
      !appServicePlanNameError &&
      !storageAccountNameError &&
      !storageNameUnavailable &&
      !isCheckingStorageName &&
      (isCreatingNewResourceGroup ? newResourceGroupName : selectedResourceGroup) &&
      selectedLocation &&
      (isCreatingNewStorageAccount ? newStorageAccountName : selectedStorageAccount) &&
      !isDeploying
    : selectedSubscription && selectedLogicApp && !isDeploying;

  return (
    <div className={styles.deployContainer}>
      <Text className={styles.deployTitle}>{intlText.DEPLOY_TO_AZURE}</Text>

      <div className={styles.deployContent}>
        <div className={styles.deploySection}>
          <Text className={styles.sectionTitle}>{intlText.SELECT_SUBSCRIPTION}</Text>
          {isSubscriptionsLoading ? (
            <div className={styles.loadingContainer}>
              <Spinner size="small" />
              <Text>{intlText.LOADING_SUBSCRIPTIONS}</Text>
            </div>
          ) : (
            <Dropdown
              className={styles.dropdown}
              placeholder={intlText.SELECT_SUBSCRIPTION_PLACEHOLDER}
              value={subscriptionsList?.find((s) => s.subscriptionId === selectedSubscription)?.subscriptionName || ''}
              onOptionSelect={handleSubscriptionChange}
              disabled={isDeploying}
            >
              {subscriptionsList?.map((subscription) => (
                <Option key={subscription.subscriptionId} value={subscription.subscriptionId}>
                  {subscription.subscriptionName}
                </Option>
              ))}
            </Dropdown>
          )}
        </div>

        {selectedSubscription && (
          <div className={styles.deploySection}>
            <Text className={styles.sectionTitle}>{intlText.SELECT_LOGIC_APP}</Text>
            {isLogicAppsLoading ? (
              <div className={styles.loadingContainer}>
                <Spinner size="small" />
                <Text>{intlText.LOADING_LOGIC_APPS}</Text>
              </div>
            ) : (
              <Dropdown
                className={styles.dropdown}
                placeholder={intlText.SELECT_LOGIC_APP_PLACEHOLDER}
                value={isCreatingNew ? intlText.CREATE_NEW_LOGIC_APP : selectedLogicAppName}
                onOptionSelect={handleLogicAppChange}
                disabled={isDeploying}
              >
                <Option key="__CREATE_NEW__" value="__CREATE_NEW__" text={intlText.CREATE_NEW_LOGIC_APP}>
                  {intlText.CREATE_NEW_LOGIC_APP}
                </Option>
                {logicAppsList?.map((app) => (
                  <Option key={app.id} value={app.id} text={`${app.name} (${app.resourceGroup})`}>
                    {app.name} ({app.resourceGroup})
                  </Option>
                ))}
              </Dropdown>
            )}
          </div>
        )}

        {selectedSubscription && isCreatingNew && (
          <>
            <div className={styles.deploySection}>
              <Label htmlFor="newLogicAppName">{intlText.LOGIC_APP_NAME}</Label>
              <Input
                id="newLogicAppName"
                className={styles.dropdown}
                placeholder={intlText.LOGIC_APP_NAME_PLACEHOLDER}
                value={newLogicAppName}
                onChange={handleNewLogicAppNameChange}
                disabled={isDeploying}
              />
              {logicAppNameExists && (
                <Text style={{ color: 'var(--vscode-errorForeground)', fontSize: '12px', marginTop: '4px' }}>
                  {intlText.LOGIC_APP_NAME_EXISTS}
                </Text>
              )}
              {logicAppNameError && (
                <Text style={{ color: 'var(--vscode-errorForeground)', fontSize: '12px', marginTop: '4px' }}>{logicAppNameError}</Text>
              )}
            </div>

            <div className={styles.deploySection}>
              <Text className={styles.sectionTitle}>{intlText.RESOURCE_GROUP}</Text>
              {isResourceGroupsLoading ? (
                <div className={styles.loadingContainer}>
                  <Spinner size="small" />
                  <Text>{intlText.LOADING_RESOURCE_GROUPS}</Text>
                </div>
              ) : (
                <Dropdown
                  className={styles.dropdown}
                  placeholder={intlText.RESOURCE_GROUP_PLACEHOLDER}
                  value={
                    isCreatingNewResourceGroup
                      ? intlText.CREATE_NEW_RESOURCE_GROUP
                      : resourceGroupsList?.find((rg) => rg.name === selectedResourceGroup)?.name || ''
                  }
                  onOptionSelect={handleResourceGroupChange}
                  disabled={isDeploying}
                >
                  <Option key="__CREATE_NEW__" value="__CREATE_NEW__" text={intlText.CREATE_NEW_RESOURCE_GROUP}>
                    {intlText.CREATE_NEW_RESOURCE_GROUP}
                  </Option>
                  {resourceGroupsList?.map((rg) => (
                    <Option key={rg.name} value={rg.name} text={`${rg.name} (${rg.location})`}>
                      {rg.name} ({rg.location})
                    </Option>
                  ))}
                </Dropdown>
              )}
            </div>

            {isCreatingNewResourceGroup && (
              <div className={styles.deploySection}>
                <Label htmlFor="newResourceGroupName">{intlText.NEW_RESOURCE_GROUP_NAME}</Label>
                <Input
                  id="newResourceGroupName"
                  className={styles.dropdown}
                  placeholder={intlText.RESOURCE_GROUP_NAME_PLACEHOLDER}
                  value={newResourceGroupName}
                  onChange={handleNewResourceGroupNameChange}
                  disabled={isDeploying}
                />
              </div>
            )}

            <div className={styles.deploySection}>
              <Text className={styles.sectionTitle}>{intlText.LOCATION}</Text>
              {isLocationsLoading ? (
                <div className={styles.loadingContainer}>
                  <Spinner size="small" />
                  <Text>{intlText.LOADING_LOCATIONS}</Text>
                </div>
              ) : (
                <Dropdown
                  className={styles.dropdown}
                  placeholder={intlText.LOCATION_PLACEHOLDER}
                  value={locationsList?.find((loc) => loc.name === selectedLocation)?.displayName || ''}
                  onOptionSelect={handleLocationChange}
                  disabled={isDeploying}
                >
                  {locationsList?.map((loc) => (
                    <Option key={loc.name} value={loc.name} text={loc.displayName}>
                      {loc.displayName}
                    </Option>
                  ))}
                </Dropdown>
              )}
            </div>

            {selectedLocation && (
              <div className={styles.deploySection}>
                <Text className={styles.sectionTitle}>{intlText.APP_SERVICE_PLAN}</Text>
                {isAppServicePlansLoading ? (
                  <div className={styles.loadingContainer}>
                    <Spinner size="small" />
                    <Text>{intlText.LOADING_APP_SERVICE_PLANS}</Text>
                  </div>
                ) : (
                  <Dropdown
                    className={styles.dropdown}
                    placeholder={intlText.APP_SERVICE_PLAN_PLACEHOLDER}
                    value={
                      isCreatingNewAppServicePlan
                        ? intlText.CREATE_NEW_APP_SERVICE_PLAN
                        : appServicePlansList?.find((plan) => plan.id === selectedAppServicePlan)?.name || ''
                    }
                    onOptionSelect={handleAppServicePlanChange}
                    disabled={isDeploying}
                  >
                    <Option key="__CREATE_NEW__" value="__CREATE_NEW__" text={intlText.CREATE_NEW_APP_SERVICE_PLAN}>
                      {intlText.CREATE_NEW_APP_SERVICE_PLAN}
                    </Option>
                    {appServicePlansList?.map((plan) => (
                      <Option key={plan.id} value={plan.id} text={`${plan.name} (${plan.sku?.name || 'Unknown'})`}>
                        {plan.name} ({plan.sku?.name || 'Unknown'})
                      </Option>
                    ))}
                  </Dropdown>
                )}
              </div>
            )}

            {isCreatingNewAppServicePlan && (
              <>
                <div className={styles.deploySection}>
                  <Label htmlFor="newAppServicePlanName">{intlText.NEW_APP_SERVICE_PLAN_NAME}</Label>
                  <Input
                    id="newAppServicePlanName"
                    className={styles.dropdown}
                    placeholder={intlText.APP_SERVICE_PLAN_NAME_PLACEHOLDER}
                    value={newAppServicePlanName}
                    onChange={handleNewAppServicePlanNameChange}
                    disabled={isDeploying}
                  />
                  {appServicePlanNameExists && (
                    <Text style={{ color: 'var(--vscode-errorForeground)', fontSize: '12px', marginTop: '4px' }}>
                      {intlText.APP_SERVICE_PLAN_NAME_EXISTS}
                    </Text>
                  )}
                  {appServicePlanNameError && (
                    <Text style={{ color: 'var(--vscode-errorForeground)', fontSize: '12px', marginTop: '4px' }}>
                      {appServicePlanNameError}
                    </Text>
                  )}
                </div>

                <div className={styles.deploySection}>
                  <Text className={styles.sectionTitle}>{intlText.APP_SERVICE_PLAN_SKU}</Text>
                  <Dropdown
                    className={styles.dropdown}
                    placeholder={intlText.SELECT_SKU_PLACEHOLDER}
                    value={selectedAppServicePlanSku}
                    onOptionSelect={handleAppServicePlanSkuChange}
                    disabled={isDeploying}
                  >
                    <Option key="WS1" value="WS1" text="WS1 (Workflow Standard 1)">
                      WS1 (Workflow Standard 1)
                    </Option>
                    <Option key="WS2" value="WS2" text="WS2 (Workflow Standard 2)">
                      WS2 (Workflow Standard 2)
                    </Option>
                    <Option key="WS3" value="WS3" text="WS3 (Workflow Standard 3)">
                      WS3 (Workflow Standard 3)
                    </Option>
                  </Dropdown>
                </div>
              </>
            )}

            {selectedLocation && (
              <div className={styles.deploySection}>
                <Text className={styles.sectionTitle}>{intlText.STORAGE_ACCOUNT}</Text>
                {isStorageAccountsLoading ? (
                  <div className={styles.loadingContainer}>
                    <Spinner size="small" />
                    <Text>{intlText.LOADING_STORAGE_ACCOUNTS}</Text>
                  </div>
                ) : (
                  <Dropdown
                    className={styles.dropdown}
                    placeholder={intlText.STORAGE_ACCOUNT_PLACEHOLDER}
                    value={
                      isCreatingNewStorageAccount
                        ? intlText.CREATE_NEW_STORAGE_ACCOUNT
                        : storageAccountsList?.find((storage) => storage.id === selectedStorageAccount)?.name || ''
                    }
                    onOptionSelect={handleStorageAccountChange}
                    disabled={isDeploying}
                  >
                    <Option key="__CREATE_NEW__" value="__CREATE_NEW__" text={intlText.CREATE_NEW_STORAGE_ACCOUNT}>
                      {intlText.CREATE_NEW_STORAGE_ACCOUNT}
                    </Option>
                    {storageAccountsList?.map((storage) => (
                      <Option key={storage.id} value={storage.id} text={storage.name}>
                        {storage.name}
                      </Option>
                    ))}
                  </Dropdown>
                )}
              </div>
            )}

            {isCreatingNewStorageAccount && (
              <div className={styles.deploySection}>
                <Label htmlFor="newStorageAccountName">{intlText.NEW_STORAGE_ACCOUNT_NAME}</Label>
                <Input
                  id="newStorageAccountName"
                  className={styles.dropdown}
                  placeholder={intlText.STORAGE_ACCOUNT_NAME_PLACEHOLDER}
                  value={newStorageAccountName}
                  onChange={handleNewStorageAccountNameChange}
                  disabled={isDeploying}
                />
                {isCheckingStorageName && (
                  <Text style={{ color: 'var(--vscode-foreground)', fontSize: '12px', marginTop: '4px' }}>
                    {intlText.CHECKING_AVAILABILITY}
                  </Text>
                )}
                {storageAccountNameError && (
                  <Text style={{ color: 'var(--vscode-errorForeground)', fontSize: '12px', marginTop: '4px' }}>
                    {storageAccountNameError}
                  </Text>
                )}
                {!storageAccountNameError && storageNameUnavailable && (
                  <Text style={{ color: 'var(--vscode-errorForeground)', fontSize: '12px', marginTop: '4px' }}>
                    {storageNameMessage || intlText.STORAGE_ACCOUNT_NAME_TAKEN}
                  </Text>
                )}
                {!storageAccountNameError &&
                  !storageNameUnavailable &&
                  !isCheckingStorageName &&
                  newStorageAccountName &&
                  newStorageAccountName.length >= 3 && (
                    <Text style={{ color: 'var(--vscode-testing-iconPassed)', fontSize: '12px', marginTop: '4px' }}>
                      {intlText.STORAGE_ACCOUNT_NAME_AVAILABLE}
                    </Text>
                  )}
              </div>
            )}

            <div className={styles.deploySection}>
              <Checkbox
                label={intlText.CREATE_APP_INSIGHTS}
                checked={createAppInsights}
                onChange={handleCreateAppInsightsChange}
                disabled={isDeploying}
              />
            </div>

            {createAppInsights && (
              <div className={styles.deploySection}>
                <Label htmlFor="newAppInsightsName">{intlText.APP_INSIGHTS_NAME}</Label>
                <Input
                  id="newAppInsightsName"
                  className={styles.dropdown}
                  value={newAppInsightsName}
                  onChange={(_, data) => dispatch(setNewAppInsightsName(data.value))}
                  disabled={isDeploying}
                />
              </div>
            )}
          </>
        )}

        {error && <Text className={styles.errorMessage}>{error}</Text>}

        {deploymentStatus === 'success' && (
          <Text className={styles.successMessage}>{deploymentMessage || intlText.DEPLOYMENT_SUCCESS}</Text>
        )}

        {deploymentStatus === 'failed' && <Text className={styles.errorMessage}>{deploymentMessage || intlText.DEPLOYMENT_FAILED}</Text>}
      </div>

      <div className={styles.deployActions}>
        {isDeploying ? (
          <div className={styles.loadingContainer}>
            <Spinner size="small" />
            <Text>{intlText.DEPLOYING}</Text>
          </div>
        ) : (
          <>
            <Button appearance="primary" className={styles.deployButton} onClick={handleDeploy} disabled={!canDeploy}>
              {intlText.DEPLOY_BUTTON}
            </Button>
            <Button className={styles.deployButton} onClick={handleCancel}>
              {intlText.CANCEL_BUTTON}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
