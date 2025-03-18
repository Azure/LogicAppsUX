import type { RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { makeStyles, Text } from '@fluentui/react-components';
import { useSelector } from 'react-redux';
import { equals, isUndefinedOrEmptyString, normalizeConnectorId } from '@microsoft/logic-apps-shared';
import { ConnectorConnectionStatus } from '../connections/connector';
import { WorkflowKind } from '../../../core/state/workflow/workflowInterfaces';
import { ResourceDisplay } from './ResourceDisplay';
import { useTemplatesStrings } from '../templatesStrings';
import { TemplatesSection } from '@microsoft/designer-ui';
import { getConnectorResources } from '../../../core/templates/utils/helper';

const useStyles = makeStyles({
  root: {
    paddingBottom: '24px',
  },
});

export const ReviewCreatePanel = () => {
  const intl = useIntl();
  const { parameterDefinitions, workflows, connections } = useSelector((state: RootState) => state.template);
  const { enableResourceSelection } = useSelector((state: RootState) => state.templateOptions);
  const {
    connections: { mapping },
    subscriptionId,
    location,
    isConsumption,
    isCreateView,
  } = useSelector((state: RootState) => state.workflow);
  const { resourceStrings } = useTemplatesStrings();
  const styles = useStyles();

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
  const connectionTexts = getConnectorResources(intl);

  return (
    <div className="msla-templates-tab">
      {!isConsumption && (
        <TemplatesSection
          title={intlText.BASICS}
          titleHtmlFor={'detailsLabel'}
          items={Object.values(workflows).flatMap((workflow) => [
            {
              type: 'text',
              label: resourceStrings.WORKFLOW_NAME,
              value: isUndefinedOrEmptyString(workflow.workflowName) ? intlText.PLACEHOLDER : workflow.workflowName,
            },
            {
              type: 'text',
              label: intlText.STATE_TYPE,
              value: equals(workflow.kind, WorkflowKind.STATEFUL)
                ? intlText.kind_stateful
                : (intlText.kind_stateless ?? intlText.PLACEHOLDER),
            },
          ])}
        />
      )}

      {enableResourceSelection && <ResourceDisplay invertBolds cssOverrides={styles} />}

      {isConsumption && !Object.keys(connections).length && !Object.keys(parameterDefinitions).length ? (
        <div className="msla-templates-empty-review-tab">
          <Text className="msla-templates-tab-review-section-details-value">
            {isCreateView ? intlText.CREATE_VIEW_NO_CONFIG : intlText.UPDATE_VIEW_NO_CONFIG}
          </Text>
        </div>
      ) : null}

      {Object.keys(connections).length > 0 && (
        <TemplatesSection
          title={intlText.CONNECTIONS}
          titleHtmlFor={'connectionsLabel'}
          items={Object.keys(connections).map((connectionKey) => {
            const hasConnection = mapping[connectionKey] !== undefined;
            return {
              type: 'text',
              label: (
                <ConnectorConnectionStatus
                  key={connectionKey}
                  connectionKey={connectionKey.replace('_#workflowname#', '')}
                  connectorId={normalizeConnectorId(connections[connectionKey].connectorId ?? '', subscriptionId, location)}
                />
              ),
              value: hasConnection ? connectionTexts.connected : connectionTexts.notConnected,
            };
          })}
        />
      )}

      {Object.keys(parameterDefinitions).length > 0 && (
        <TemplatesSection
          title={intlText.PARAMETERS}
          titleHtmlFor={'parametersLabel'}
          items={Object.values(parameterDefinitions).map((parameter) => ({
            type: 'text',
            label: parameter.displayName,
            value: parameter.value ?? intlText.PLACEHOLDER,
          }))}
        />
      )}
    </div>
  );
};
