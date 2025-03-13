import type { RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { Label, Text } from '@fluentui/react-components';
import { useSelector } from 'react-redux';
import { equals, isUndefinedOrEmptyString, normalizeConnectorId } from '@microsoft/logic-apps-shared';
import { ConnectorConnectionStatus } from '../connections/connector';
import { WorkflowKind } from '../../../core/state/workflow/workflowInterfaces';

export const ReviewCreatePanel = () => {
  const intl = useIntl();
  const { parameterDefinitions, workflows, connections } = useSelector((state: RootState) => state.template);
  const {
    existingWorkflowName,
    connections: { mapping },
    subscriptionId,
    location,
    isConsumption,
    isCreateView,
  } = useSelector((state: RootState) => state.workflow);

  const intlText = {
    BASICS: intl.formatMessage({
      defaultMessage: 'Basics',
      id: '1LSKq8',
      description: 'Accessibility label for the basics section',
    }),
    CONNECTIONS: intl.formatMessage({
      defaultMessage: 'Connections',
      id: 'Wt1TZJ',
      description: 'Accessibility label for the connections section',
    }),
    PARAMETERS: intl.formatMessage({
      defaultMessage: 'Parameters',
      id: 'oWAB0H',
      description: 'Accessibility label for the parameters section',
    }),
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Workflow name',
      id: 'oqgNX3',
      description: 'Accessibility label for workflow name',
    }),
    STATE_TYPE: intl.formatMessage({
      defaultMessage: 'State type',
      id: 'tzeDPE',
      description: 'Accessibility label for state kind',
    }),
    PLACEHOLDER: intl.formatMessage({
      defaultMessage: '----',
      id: 'wPi8wS',
      description: 'Accessibility label indicating that the value is not set',
    }),
    kind_stateful: intl.formatMessage({
      defaultMessage: 'Stateful',
      id: 'Qqmb+W',
      description: 'Dropdown option for stateful type',
    }),
    kind_stateless: intl.formatMessage({
      defaultMessage: 'Stateless',
      id: 'cNXS5n',
      description: 'Dropdown option for stateless type',
    }),
    CREATE_VIEW_NO_CONFIG: intl.formatMessage({
      defaultMessage: 'Select Create to create a new workflow based on this template, no configuration required.',
      id: 'uOU0lL',
      description: 'Accessibility label for no configuration required',
    }),
    UPDATE_VIEW_NO_CONFIG: intl.formatMessage({
      defaultMessage: 'Select Update to update this workflow based on this template, no configuration required.',
      id: 'OaUode',
      description: 'Accessibility label for no configuration required',
    }),
  };

  return (
    <div className="msla-templates-tab">
      {!isConsumption && (
        <>
          <Label className="msla-templates-tab-label" htmlFor={'detailsLabel'}>
            {intlText.BASICS}
          </Label>
          <div className="msla-templates-tab-review-section">
            {Object.values(workflows).map((workflow) => {
              const workflowNameToShow = existingWorkflowName ?? workflow.workflowName;
              return (
                <div key={workflow.id}>
                  <div className="msla-templates-tab-review-section-details">
                    <Text className="msla-templates-tab-review-section-details-title">{intlText.WORKFLOW_NAME}</Text>
                    <Text className="msla-templates-tab-review-section-details-value">
                      {isUndefinedOrEmptyString(workflowNameToShow) ? intlText.PLACEHOLDER : workflowNameToShow}
                    </Text>
                  </div>
                  <div className="msla-templates-tab-review-section-details">
                    <Text className="msla-templates-tab-review-section-details-title">{intlText.STATE_TYPE}</Text>
                    <Text className="msla-templates-tab-review-section-details-value">
                      {equals(workflow.kind, WorkflowKind.STATEFUL)
                        ? intlText.kind_stateful
                        : (intlText.kind_stateless ?? intlText.PLACEHOLDER)}
                    </Text>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {isConsumption && !Object.keys(connections).length && !Object.keys(parameterDefinitions).length ? (
        <div className="msla-templates-empty-review-tab">
          <Text className="msla-templates-tab-review-section-details-value">
            {isCreateView ? intlText.CREATE_VIEW_NO_CONFIG : intlText.UPDATE_VIEW_NO_CONFIG}
          </Text>
        </div>
      ) : null}

      {Object.keys(connections).length > 0 && (
        <>
          <Label className="msla-templates-tab-label" htmlFor={'connectionsLabel'}>
            {intlText.CONNECTIONS}
          </Label>
          <div className="msla-templates-tab-review-section">
            {Object.keys(connections).map((connectionKey) => (
              <ConnectorConnectionStatus
                key={connectionKey}
                connectionKey={connectionKey.replace('_#workflowname#', '')}
                connectorId={normalizeConnectorId(connections[connectionKey].connectorId ?? '', subscriptionId, location)}
                hasConnection={mapping[connectionKey] !== undefined}
                intl={intl}
              />
            ))}
          </div>
        </>
      )}

      {Object.keys(parameterDefinitions).length > 0 && (
        <>
          <Label className="msla-templates-tab-label" htmlFor={'parametersLabel'}>
            {intlText.PARAMETERS}
          </Label>
          <div className="msla-templates-tab-review-section">
            {Object.values(parameterDefinitions)?.map((parameter) => (
              <div key={parameter.name} className="msla-templates-tab-review-section-details">
                <Text className="msla-templates-tab-review-section-details-title">{parameter.displayName}</Text>
                <Text className="msla-templates-tab-review-section-details-value">{parameter.value ?? intlText.PLACEHOLDER}</Text>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
