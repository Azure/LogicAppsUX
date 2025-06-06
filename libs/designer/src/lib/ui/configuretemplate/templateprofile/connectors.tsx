import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import type { OptionOnSelectData, SelectionEvents } from '@fluentui/react-components';
import { Dropdown, Field, Option } from '@fluentui/react-components';
import { equals, getPropertyValue, normalizeConnectorId } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { updateTemplateManifest } from '../../../core/state/templates/templateSlice';
import { useAllConnectors } from '../../../core/configuretemplate/utils/queries';
import { getConnectorKind, sanitizeConnectorId } from '../../../core/configuretemplate/utils/helper';

export const FeaturedConnectors = () => {
  const intl = useIntl();
  const texts = {
    LOADING: intl.formatMessage({
      defaultMessage: 'Loading connectors ...',
      id: 'UuQh+g',
      description: 'Loading text',
    }),
    NO_ITEMS: intl.formatMessage({
      defaultMessage: 'No connectors found',
      id: '1x5IuY',
      description: 'No items to select text',
    }),
  };
  const dispatch = useDispatch<AppDispatch>();

  const { operationInfos, featuredConnectors, workflows, errors, apiErrors, subscriptionId, location } = useSelector((state: RootState) => {
    return {
      operationInfos: state.operation.operationInfo,
      featuredConnectors: state.template.manifest?.featuredConnectors ?? [],
      workflows: state.template.workflows,
      errors: state.template.errors,
      apiErrors: state.template.apiValidatationErrors?.template,
      subscriptionId: state.workflow.subscriptionId,
      location: state.workflow.location,
    };
  });
  const { data: allConnectors, isLoading } = useAllConnectors(operationInfos, workflows);
  const selectedConnectors = useMemo(() => {
    return allConnectors?.filter((connector) =>
      featuredConnectors.some((conn) => equals(normalizeConnectorId(conn.id, subscriptionId, location), connector.id))
    );
  }, [allConnectors, featuredConnectors, location, subscriptionId]);

  const onOptionSelect = useCallback(
    (_event: SelectionEvents, data: OptionOnSelectData) => {
      const selectedFeaturedConnectors = data.selectedOptions?.map((id) => ({ id: sanitizeConnectorId(id), kind: getConnectorKind(id) }));
      dispatch(updateTemplateManifest({ featuredConnectors: selectedFeaturedConnectors }));
    },
    [dispatch]
  );

  return (
    <Field required={true} validationMessage={getPropertyValue(apiErrors?.manifest ?? errors?.manifest, 'featuredConnectors')}>
      <Dropdown
        style={{ width: '100%' }}
        multiselect={true}
        onOptionSelect={onOptionSelect}
        disabled={isLoading}
        value={selectedConnectors?.map((connector) => connector.displayName).join(', ')}
        selectedOptions={selectedConnectors?.map((connector) => connector.id)}
        placeholder={isLoading ? texts.LOADING : ''}
      >
        {!isLoading && !allConnectors?.length ? (
          <Option key={'no-items'} value={'#noitem#'} disabled>
            {texts.NO_ITEMS}
          </Option>
        ) : (
          allConnectors?.map((resource) => (
            <Option key={resource.id} value={resource.id}>
              {resource.displayName}
            </Option>
          ))
        )}
      </Dropdown>
    </Field>
  );
};
