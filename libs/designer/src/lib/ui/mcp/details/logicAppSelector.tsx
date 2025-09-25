import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Field, Text, Combobox, Option, Link } from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { equals } from '@microsoft/logic-apps-shared';
import { setLogicApp } from '../../../core/state/mcp/resourceSlice';
import { useEmptyLogicApps } from '../../../core/mcp/utils/queries';
import { useMcpDetailsStyles } from './styles';
import { getLogicAppId } from '../../../core/configuretemplate/utils/helper';
import { McpPanelView, openMcpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';

const NO_ITEM_VALUE = 'NO_ITEM_VALUE';

export const LogicAppSelector = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { subscriptionId, resourceGroup, location, logicAppName, newLogicAppDetails } = useSelector((state: RootState) => ({
    subscriptionId: state.mcpOptions.resourceDetails?.subscriptionId,
    resourceGroup: state.mcpOptions.resourceDetails?.resourceGroup,
    location: state.mcpOptions.resourceDetails?.location,
    logicAppName: state.resource.logicAppName,
    newLogicAppDetails: state.resource.newLogicAppDetails,
  }));
  const { data: logicApps, isLoading: isLogicAppsLoading } = useEmptyLogicApps(subscriptionId ?? '');

  const intl = useIntl();
  const styles = useMcpDetailsStyles();

  const intlText = useMemo(
    () => ({
      LOGIC_APP: intl.formatMessage({
        defaultMessage: 'Logic app',
        id: 'BsZRu5',
        description: 'Label field for logic app selector',
      }),
      CREATE_NEW: intl.formatMessage({
        defaultMessage: 'Create new',
        id: 'UJ/l5b',
        description: 'Create new logic app link',
      }),
      LOADING: intl.formatMessage({
        defaultMessage: 'Loading logic apps ...',
        id: 'BwxTBw',
        description: 'Loading logic apps',
      }),
      NO_ITEMS: intl.formatMessage({
        defaultMessage: 'No logic apps found',
        id: '/boIFK',
        description: 'No logic apps items to select text',
      }),
      SEARCH_PLACEHOLDER: intl.formatMessage({
        defaultMessage: 'Search logic apps...',
        id: '/4vNBB',
        description: 'Placeholder text for logic app search',
      }),
      SELECT_PLACEHOLDER: intl.formatMessage({
        defaultMessage: 'Select a logic app',
        id: 'TxdbTq',
        description: 'Placeholder text for logic app selection',
      }),
      NO_RESULTS: intl.formatMessage({
        defaultMessage: 'No results for',
        id: 'W83QYZ',
        description: 'Text displayed when no results match the search term',
      }),
    }),
    [intl]
  );

  const [selectedResource, setSelectedResource] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (equals(logicAppName, newLogicAppDetails?.appName)) {
      setSelectedResource(getLogicAppId(subscriptionId as string, resourceGroup as string, logicAppName as string));
    }
  }, [logicAppName, newLogicAppDetails?.appName, subscriptionId, resourceGroup]);

  const resources = useMemo(() => {
    const result =
      newLogicAppDetails?.appName && equals(newLogicAppDetails.createStatus, 'succeeded')
        ? [
            {
              id: getLogicAppId(subscriptionId as string, resourceGroup as string, newLogicAppDetails.appName),
              name: newLogicAppDetails.appName,
              displayName: `${newLogicAppDetails.appName} (new)`,
            },
          ]
        : [];

    result.push(
      ...(logicApps ?? [])
        .map((app) => ({
          id: app.id,
          name: app.name,
          displayName: app.name,
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
    );

    return result;
  }, [logicApps, newLogicAppDetails?.appName, newLogicAppDetails?.createStatus, resourceGroup, subscriptionId]);

  const filteredResources = useMemo(() => {
    if (!searchTerm?.trim()) {
      return resources;
    }

    return resources.filter((resource) => resource.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [resources, searchTerm]);

  const controlValue = useMemo(() => {
    if (searchTerm !== undefined) {
      return searchTerm;
    }

    const selectedResourceInfo = resources.find((r) => equals(r.id, selectedResource));
    return selectedResourceInfo?.displayName ?? selectedResource;
  }, [searchTerm, resources, selectedResource]);

  const onLogicAppSelect = useCallback(
    (value: string) => {
      if (selectedResource !== value) {
        if (newLogicAppDetails?.appName && equals(resources[0].id, value)) {
          dispatch(
            setLogicApp({
              resourceGroup: resourceGroup as string,
              location: location as string,
              logicAppName: newLogicAppDetails.appName,
            })
          );
          setSelectedResource(value);
          return;
        }

        const app = logicApps?.find((app) => equals(app.id, value));
        if (app) {
          dispatch(
            setLogicApp({
              resourceGroup: app.resourceGroup,
              location: app.location,
              logicAppName: app.name,
            })
          );
          setSelectedResource(value);
        }
      }
    },
    [dispatch, location, logicApps, newLogicAppDetails?.appName, resourceGroup, resources, selectedResource]
  );

  const handleNewAppCreate = useCallback(() => {
    dispatch(openMcpPanelView({ panelView: McpPanelView.CreateLogicApp }));
  }, [dispatch]);

  return (
    <div className={styles.container}>
      <div className={styles.labelSection}>
        <Text>{intlText.LOGIC_APP}</Text>
      </div>
      <div className={styles.fieldSection}>
        <Field required={true}>
          <div className={styles.comboboxContainer}>
            <Combobox
              className={styles.combobox}
              disabled={isLogicAppsLoading}
              value={controlValue}
              selectedOptions={selectedResource ? [selectedResource] : []}
              placeholder={isLogicAppsLoading ? intlText.LOADING : intlText.SEARCH_PLACEHOLDER}
              onOptionSelect={(_, data) => {
                if (data.optionValue && data.optionValue !== NO_ITEM_VALUE) {
                  onLogicAppSelect(data.optionValue);
                  setSearchTerm(undefined);
                }
              }}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
            >
              {!isLogicAppsLoading && !filteredResources.length ? (
                <Option key={'no-items'} value={NO_ITEM_VALUE} disabled>
                  {searchTerm?.trim() ? `${intlText.NO_RESULTS} "${searchTerm}"` : intlText.NO_ITEMS}
                </Option>
              ) : (
                filteredResources.map((resource) => (
                  <Option key={resource.id} value={resource.id}>
                    {resource.displayName}
                  </Option>
                ))
              )}
            </Combobox>
          </div>
          <Link className={styles.linkSection} disabled={!!newLogicAppDetails?.appName} onClick={handleNewAppCreate}>
            {intlText.CREATE_NEW}
          </Link>
        </Field>
      </div>
    </div>
  );
};
