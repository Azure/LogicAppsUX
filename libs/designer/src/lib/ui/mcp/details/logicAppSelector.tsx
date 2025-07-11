import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Option, Field, Dropdown, Text } from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { equals } from '@microsoft/logic-apps-shared';
import { setLogicApp } from '../../../core/state/mcp/resourceSlice';
import { useEmptyLogicApps } from '../../../core/mcp/utils/queries';
import { useMcpDetailsStyles } from './styles';

export const LogicAppSelector = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { subscriptionId, logicAppName } = useSelector((state: RootState) => state.resource);
  const { data: logicApps, isLoading: isLogicAppsLoading } = useEmptyLogicApps(subscriptionId ?? '');

  const intl = useIntl();
  const styles = useMcpDetailsStyles();

  const intlText = useMemo(
    () => ({
      LOGIC_APP: intl.formatMessage({
        defaultMessage: 'Logic app instance',
        id: 'IpD27y',
        description: 'Label field for logic app instance',
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
    }),
    [intl]
  );

  const [selectedResource, setSelectedResource] = useState<string>('');

  const resources = useMemo(
    () =>
      (logicApps ?? [])
        .map((app) => ({
          id: app.id,
          name: app.name,
          displayName: app.name,
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [logicApps]
  );

  const onLogicAppSelect = useCallback(
    (value: string) => {
      const app = logicApps?.find((app) => equals(app.name, value));
      if (app) {
        dispatch(
          setLogicApp({
            resourceGroup: app.resourceGroup,
            location: app.location,
            logicAppName: app.name,
          })
        );
      }
    },
    [dispatch, logicApps]
  );

  useEffect(() => {
    if (!isLogicAppsLoading) {
      const resource = resources.find((resource) => equals(resource.name, logicAppName ?? ''))?.displayName;
      if (!resource && !!logicAppName) {
        onLogicAppSelect('');
      }

      if (resource !== selectedResource) {
        setSelectedResource(resource || '');
      }
    }
  }, [resources, logicAppName, onLogicAppSelect, isLogicAppsLoading, selectedResource]);

  return (
    <div className={styles.container}>
      <div className={styles.labelSection}>
        <Text>{intlText.LOGIC_APP}</Text>
      </div>
      <div className={styles.fieldSection}>
        <Field required={true}>
          <Dropdown
            style={{ width: '100%' }}
            id={'logicapps'}
            onOptionSelect={(e, option) => onLogicAppSelect(option?.optionValue as string)}
            disabled={isLogicAppsLoading}
            value={selectedResource}
            size="small"
            placeholder={isLogicAppsLoading ? intlText.LOADING : ''}
          >
            {!isLogicAppsLoading && !resources.length ? (
              <Option key={'no-items'} value={'#noitem#'} disabled>
                {intlText.NO_ITEMS}
              </Option>
            ) : (
              resources.map((resource) => (
                <Option key={resource.id} value={resource.name}>
                  {resource.displayName}
                </Option>
              ))
            )}
          </Dropdown>
        </Field>
      </div>
    </div>
  );
};
