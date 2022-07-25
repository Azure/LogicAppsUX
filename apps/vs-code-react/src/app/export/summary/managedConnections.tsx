import { QueryKeys } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateManagedConnections } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { parseResourceGroupsData } from './helper';
import { Checkbox, Dropdown, Text } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const ManagedConnections: React.FC = () => {
  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();
  const [isConnectionsChecked, setConnectionsChecked] = useState(false);
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
  const { selectedSubscription, managedConnections } = exportData;
  const { isManaged, resourceGroup: selectedResourceGroup } = managedConnections;

  const intlText = {
    DEPLOY_MANAGED_CONNECTIONS: intl.formatMessage({
      defaultMessage: 'Deploy managed connections',
      description: 'Deploy managed connections text',
    }),
    MANAGED_CONNECTIONS: intl.formatMessage({
      defaultMessage: 'Deploying Managed Connections. This is not recommended for production environments.',
      description: 'Managed Connections text',
    }),
    SELECT_OPTION: intl.formatMessage({
      defaultMessage: 'Select an option',
      description: 'Select an option placeholder',
    }),
    RESOURCE_GROUP: intl.formatMessage({
      defaultMessage: 'Resource group',
      description: 'Resource group title',
    }),
  };

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
    });
  }, [accessToken, baseUrl]);

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

    const onChangeResourceGroup = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
      if (selectedOption && selectedResourceGroup !== selectedOption.key) {
        const resourceGroupId = selectedOption.key as string;
        dispatch(
          updateManagedConnections({
            isManaged: isManaged,
            resourceGroup: resourceGroupId,
          })
        );
      }
    };

    return isConnectionsChecked ? (
      <Dropdown
        placeholder={intlText.SELECT_OPTION}
        label={intlText.RESOURCE_GROUP}
        disabled={isResourceGroupsLoading || !resourceGroups.length}
        options={resourceGroups}
        className="msla-export-summary-connections-dropdown"
        onChange={onChangeResourceGroup}
      />
    ) : null;
  }, [
    isConnectionsChecked,
    intlText.SELECT_OPTION,
    intlText.RESOURCE_GROUP,
    isResourceGroupsLoading,
    resourceGroupsData,
    dispatch,
    isManaged,
    selectedResourceGroup,
  ]);

  const onChangeConnections = useCallback(
    (_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean): void => {
      const isChecked = !!checked;
      dispatch(
        updateManagedConnections({
          isManaged: isChecked,
          resourceGroup: selectedResourceGroup,
        })
      );
      setConnectionsChecked(isChecked);
    },
    [dispatch, selectedResourceGroup]
  );

  return (
    <div className="msla-export-summary-connections">
      <Text variant="large" nowrap block>
        {intlText.MANAGED_CONNECTIONS}
      </Text>
      <Checkbox
        label={intlText.DEPLOY_MANAGED_CONNECTIONS}
        checked={isConnectionsChecked}
        onChange={onChangeConnections}
        className="msla-export-summary-connections-checkbox"
      />
      {resourceGroups}
    </div>
  );
};
