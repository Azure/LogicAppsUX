import { QueryKeys } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import { updateManagedConnections } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { VSCodeContext } from '../../../webviewCommunication';
import { SearchableDropdown, type IDropdownOption } from '../../components/searchableDropdown';
import { parseResourceGroupsData } from './helper';
import { NewResourceGroup } from './newResourceGroup';
import type { ChangeEvent } from 'react';
import { useIntlMessages, exportMessages } from '../../../intl';
import { useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { LargeText } from '@microsoft/designer-ui';
import { useExportStyles } from '../exportStyles';
import type { CheckboxOnChangeData } from '@fluentui/react-components';
import { Checkbox } from '@fluentui/react-components';

export const ManagedConnections: React.FC = () => {
  const vscode = useContext(VSCodeContext);
  const dispatch: AppDispatch = useDispatch();
  const styles = useExportStyles();
  const [isConnectionsChecked, setConnectionsChecked] = useState(false);
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { baseUrl, accessToken, exportData, cloudHost } = workflowState;
  const { selectedSubscription, managedConnections } = exportData;
  const { isManaged, resourceGroup: selectedResourceGroup, resourceGroupLocation } = managedConnections;

  const intlText = useIntlMessages(exportMessages);

  useEffect(() => {
    dispatch(
      updateManagedConnections({
        isManaged: false,
        resourceGroup: undefined,
        resourceGroupLocation: undefined,
      })
    );
  }, [dispatch]);

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
      cloudHost,
      vscodeContext: vscode,
    });
  }, [accessToken, baseUrl, cloudHost, vscode]);

  const loadResourceGroups = () => {
    return apiService.getResourceGroups(selectedSubscription);
  };

  const { data: resourceGroupsData, isLoading: isResourceGroupsLoading } = useQuery<any>(
    [QueryKeys.resourceGroupsData, { selectedSubscription: selectedSubscription }],
    loadResourceGroups,
    {
      refetchOnWindowFocus: false,
    }
  );

  const resourceGroups = useMemo(() => {
    const resourceGroups: IDropdownOption[] =
      isResourceGroupsLoading || !resourceGroupsData ? [] : parseResourceGroupsData(resourceGroupsData);

    const onChangeResourceGroup = (_event: React.FormEvent<HTMLDivElement> | undefined, selectedOption?: IDropdownOption) => {
      if (selectedOption && selectedResourceGroup !== selectedOption.key) {
        const resourceGroupId = selectedOption.key as string;
        dispatch(
          updateManagedConnections({
            isManaged: isManaged,
            resourceGroup: resourceGroupId,
            resourceGroupLocation: selectedOption.data,
          })
        );
      }
    };

    const onAddNewResourceGroup = (selectedOption: IDropdownOption) => {
      resourceGroupsData.resourceGroups.unshift({ name: selectedOption.key, location: selectedOption.data, text: selectedOption.text });

      onChangeResourceGroup(undefined, selectedOption);
    };

    return isConnectionsChecked ? (
      <>
        <SearchableDropdown
          placeholder={intlText.SELECT_OPTION}
          label={intlText.RESOURCE_GROUP}
          disabled={isResourceGroupsLoading || !resourceGroups.length}
          options={resourceGroups}
          className={styles.exportSummaryConnectionsDropdown}
          onChange={onChangeResourceGroup}
          selectedKey={selectedResourceGroup !== undefined ? selectedResourceGroup : undefined}
          isLoading={isResourceGroupsLoading}
        />
        <NewResourceGroup onAddNewResourceGroup={onAddNewResourceGroup} resourceGroups={resourceGroups} />
      </>
    ) : null;
  }, [
    isResourceGroupsLoading,
    resourceGroupsData,
    isConnectionsChecked,
    intlText.SELECT_OPTION,
    intlText.RESOURCE_GROUP,
    styles.exportSummaryConnectionsDropdown,
    selectedResourceGroup,
    dispatch,
    isManaged,
  ]);

  const onChangeConnections = useCallback(
    (_ev: ChangeEvent<HTMLInputElement>, data: CheckboxOnChangeData): void => {
      const isChecked = !!data.checked;
      dispatch(
        updateManagedConnections({
          isManaged: isChecked,
          resourceGroup: selectedResourceGroup,
          resourceGroupLocation,
        })
      );
      setConnectionsChecked(isChecked);
    },
    [dispatch, resourceGroupLocation, selectedResourceGroup]
  );

  return (
    <div className={styles.exportSummaryConnections}>
      <LargeText text={intlText.MANAGED_CONNECTIONS} style={{ display: 'block' }} />
      <Checkbox
        label={intlText.DEPLOY_MANAGED_CONNECTIONS}
        checked={isConnectionsChecked}
        onChange={onChangeConnections}
        className={styles.exportSummaryConnectionsCheckbox}
      />
      {resourceGroups}
    </div>
  );
};
