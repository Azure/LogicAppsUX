import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useIntl, type IntlShape } from 'react-intl';
import { Label, Text } from '@fluentui/react-components';
import constants from '../../../../../common/constants';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';
import { Link, MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import { normalizeConnectorId, TemplateService } from '@microsoft/logic-apps-shared';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';
import { ConnectorConnectionStatus } from '../../../../templates/connections/connector';
import { useDefaultWorkflowTemplate } from '../../../../../core/state/templates/templateselectors';
import type { WorkflowTemplateData } from '../../../../../core/actions/bjsworkflow/templates';

export const ReviewCreatePanel = () => {
  const intl = useIntl();
  const { parameterDefinitions } = useSelector((state: RootState) => state.template);
  const { workflowName, kind, manifest } = useDefaultWorkflowTemplate() as WorkflowTemplateData;
  const {
    existingWorkflowName,
    connections: { mapping },
    subscriptionId,
    location,
    isConsumption,
  } = useSelector((state: RootState) => state.workflow);

  const intlText = {
    DETAILS: intl.formatMessage({
      defaultMessage: 'Details',
      id: 'idjOtt',
      description: 'Accessibility label for the details section',
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
    TEMPLATE_NAME: intl.formatMessage({
      defaultMessage: 'Template name',
      id: 'rNGm1D',
      description: 'Accessibility label for template name',
    }),
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Workflow name',
      id: 'oqgNX3',
      description: 'Accessibility label for workflow name',
    }),
    STATE: intl.formatMessage({
      defaultMessage: 'State',
      id: 'LVeWG7',
      description: 'Accessibility label for state kind',
    }),
    PLACEHOLDER: intl.formatMessage({
      defaultMessage: '----',
      id: 'wPi8wS',
      description: 'Accessibility label indicating that the value is not set',
    }),
  };
  return (
    <div className="msla-templates-tab">
      <Label className="msla-templates-tab-label" htmlFor={'detailsLabel'}>
        {intlText.DETAILS}
      </Label>
      <div className="msla-templates-tab-review-section">
        <div className="msla-templates-tab-review-section-details">
          <Text className="msla-templates-tab-review-section-details-title">{intlText.TEMPLATE_NAME}</Text>
          <Text className="msla-templates-tab-review-section-details-value">{manifest?.title}</Text>
        </div>
        {!isConsumption && (
          <>
            <div className="msla-templates-tab-review-section-details">
              <Text className="msla-templates-tab-review-section-details-title">{intlText.WORKFLOW_NAME}</Text>
              <Text className="msla-templates-tab-review-section-details-value">
                {existingWorkflowName ?? workflowName ?? intlText.PLACEHOLDER}
              </Text>
            </div>
            <div className="msla-templates-tab-review-section-details">
              <Text className="msla-templates-tab-review-section-details-title">{intlText.STATE}</Text>
              <Text className="msla-templates-tab-review-section-details-value">{kind ?? intlText.PLACEHOLDER}</Text>
            </div>
          </>
        )}
      </div>

      {Object.keys(manifest?.connections ?? {}).length > 0 && (
        <>
          <Label className="msla-templates-tab-label" htmlFor={'connectionsLabel'}>
            {intlText.CONNECTIONS}
          </Label>
          <div className="msla-templates-tab-review-section">
            {Object.keys(manifest?.connections ?? {}).map((connectionKey) => (
              <ConnectorConnectionStatus
                key={connectionKey}
                connectorId={normalizeConnectorId(manifest?.connections[connectionKey].connectorId ?? '', subscriptionId, location)}
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
  onCreateClick: () => void,
  {
    workflowName,
    isCreating,
    isCreated,
    errorMessage,
    isPrimaryButtonDisabled,
    previousTabId,
  }: {
    workflowName: string;
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
  description: isCreated ? (
    <MessageBar messageBarType={MessageBarType.success}>
      {intl.formatMessage({
        defaultMessage: 'Your workflow has been created. ',
        id: 'J+bMkk',
        description: 'The message displayed when the workflow is successfully created',
      })}
      <Link onClick={() => TemplateService()?.openBladeAfterCreate(workflowName)}>
        {intl.formatMessage({
          defaultMessage: 'Go to workflow.',
          id: 'OqrmYm',
          description: 'The link displayed to navigate to workflow when the workflow is successfully created',
        })}
      </Link>
    </MessageBar>
  ) : errorMessage ? (
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
    primaryButtonText: isCreated ? (
      intl.formatMessage({
        defaultMessage: 'Go to my workflow',
        id: 'P3OMN/',
        description: 'The button text for navigating to the workflows page after creating the workflow',
      })
    ) : isCreating ? (
      <Spinner size={SpinnerSize.xSmall} />
    ) : (
      intl.formatMessage({
        defaultMessage: 'Create',
        id: '/qrBuJ',
        description: 'Button text for creating the workflow',
      })
    ),
    primaryButtonOnClick: isCreated ? () => TemplateService()?.openBladeAfterCreate(workflowName) : onCreateClick,
    primaryButtonDisabled: isPrimaryButtonDisabled || isCreating,
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
    secondaryButtonOnClick: isCreated
      ? () => {
          dispatch(closePanel());
          dispatch(clearTemplateDetails());
        }
      : () => {
          dispatch(selectPanelTab(previousTabId));
        },
    secondaryButtonDisabled: isCreating,
  },
});
