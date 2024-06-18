import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useIntl, type IntlShape } from 'react-intl';
import { Label, Spinner, Text } from '@fluentui/react-components';
import constants from '../../../../../common/constants';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';

export const ReviewCreatePanel = () => {
  const intl = useIntl();
  const { workflowName, kind, manifest, parameters } = useSelector((state: RootState) => state.template);
  const { existingWorkflowName } = useSelector((state: RootState) => state.workflow);

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
        <div className="msla-templates-tab-review-section-details">
          <Text className="msla-templates-tab-review-section-details-title">{intlText.WORKFLOW_NAME}</Text>
          <Text className="msla-templates-tab-review-section-details-value">{existingWorkflowName ?? workflowName}</Text>
        </div>
        <div className="msla-templates-tab-review-section-details">
          <Text className="msla-templates-tab-review-section-details-title">{intlText.STATE}</Text>
          <Text className="msla-templates-tab-review-section-details-value">{kind}</Text>
        </div>
      </div>

      <Label className="msla-templates-tab-label" htmlFor={'connectionsLabel'}>
        {intlText.CONNECTIONS}
      </Label>
      <div className="msla-templates-tab-review-section">TODO</div>

      {Object.keys(parameters.definitions).length > 0 && (
        <>
          <Label className="msla-templates-tab-label" htmlFor={'parametersLabel'}>
            {intlText.PARAMETERS}
          </Label>
          <div className="msla-templates-tab-review-section">
            {Object.values(parameters.definitions)?.map((parameter) => (
              <div key={parameter.name} className="msla-templates-tab-review-section-details">
                <Text className="msla-templates-tab-review-section-details-title">{parameter.name}</Text>
                <Text className="msla-templates-tab-review-section-details-value">{parameter.value}</Text>
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
  onCreateClick: () => Promise<void>,
  {
    isLoading,
    isButtonDisabled,
  }: {
    isLoading: boolean;
    isButtonDisabled: boolean;
  }
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
  title: intl.formatMessage({
    defaultMessage: 'Review and Create',
    id: 'vlWl7f',
    description: 'The tab label for the monitoring review and create tab on the create workflow panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Review your settings, ensure everything is correctly set up, and create your workflow.',
    id: 'BPSraP',
    description: 'An accessability label that describes the objective of review and create tab',
  }),
  visible: true,
  order: 3,
  content: <ReviewCreatePanel />,
  footerContent: {
    primaryButtonText: isLoading ? (
      <Spinner size="extra-tiny" />
    ) : (
      intl.formatMessage({
        defaultMessage: 'Create',
        id: '/qrBuJ',
        description: 'Button text for creating the workflow',
      })
    ),
    primaryButtonOnClick: onCreateClick,
    primaryButtonDisabled: isButtonDisabled || isLoading,
  },
});
