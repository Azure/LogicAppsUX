import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useIntl, type IntlShape } from 'react-intl';
import { Label, Text } from '@fluentui/react-components';
import constants from '../../../../../common/constants';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';
import { MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import { equals, isUndefinedOrEmptyString, normalizeConnectorId } from '@microsoft/logic-apps-shared';
import { ConnectorConnectionStatus } from '../../../../templates/connections/connector';
import { WorkflowKind } from '../../../../../core/state/workflow/workflowInterfaces';

export const ReviewCreatePanel = () => {
  const intl = useIntl();
  const { parameterDefinitions, workflows, connections } = useSelector((state: RootState) => state.template);
  const {
    existingWorkflowName,
    connections: { mapping },
    subscriptionId,
    location,
    isConsumption,
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
                        : intlText.kind_stateless ?? intlText.PLACEHOLDER}
                    </Text>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

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

export const reviewCreateTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  shouldClearDetails: boolean,
  onCreateClick: () => void,
  {
    isCreating,
    isCreated,
    errorMessage,
    isPrimaryButtonDisabled,
    previousTabId,
  }: {
    isCreating: boolean;
    isCreated: boolean;
    errorMessage: string | undefined;
    isPrimaryButtonDisabled: boolean;
    previousTabId: string;
  }
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
  title: intl.formatMessage({
    defaultMessage: 'Review + create',
    id: 'JQBEOg',
    description: 'The tab label for the monitoring review and create tab on the create workflow panel',
  }),
  description: errorMessage ? (
    <MessageBar messageBarType={MessageBarType.error}>{errorMessage}</MessageBar>
  ) : (
    intl.formatMessage({
      defaultMessage: 'Review your settings, ensure everything is correctly set up, and create your workflow.',
      id: 'xDHpeS',
      description: 'An accessibility label that describes the objective of review and create tab',
    })
  ),
  hasError: false,
  content: <ReviewCreatePanel />,
  footerContent: {
    primaryButtonText: isCreating ? (
      <Spinner size={SpinnerSize.xSmall} />
    ) : (
      intl.formatMessage({
        defaultMessage: 'Create',
        id: '/qrBuJ',
        description: 'Button text for creating the workflow',
      })
    ),
    primaryButtonOnClick: onCreateClick,
    primaryButtonDisabled: isPrimaryButtonDisabled || isCreating || isCreated,
    secondaryButtonText: isCreated
      ? intl.formatMessage({
          defaultMessage: 'Close',
          id: 'FTrMxN',
          description: 'Button text for closing the panel',
        })
      : intl.formatMessage({
          defaultMessage: 'Previous',
          id: 'Yua/4o',
          description: 'Button text for moving to the previous tab in the create workflow panel',
        }),
    secondaryButtonOnClick: () => dispatch(selectPanelTab(previousTabId)),
    secondaryButtonDisabled: isCreating,
  },
});
