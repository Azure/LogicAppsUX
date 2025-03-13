import type { RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { makeStyles, Text, tokens } from '@fluentui/react-components';
import { useSelector } from 'react-redux';
import { normalizeConnectorId } from '@microsoft/logic-apps-shared';
import { CompactConnectorConnectionStatus } from '../connections/connector';
import { ResourceDisplay } from './ResourceDisplay';

const useStyles = makeStyles({
  actionName: {
    color: tokens.colorPaletteLavenderBorderActive,
  },
});

type ReviewCreatePanelProps = {
  resourceOverrides?: {
    templateName?: string;
    workflowName?: string;
  };
};

export const ReviewAddPanel = ({ resourceOverrides }: ReviewCreatePanelProps) => {
  const intl = useIntl();
  const { parameterDefinitions, workflows, connections } = useSelector((state: RootState) => state.template);
  const { enableResourceSelection } = useSelector((state: RootState) => state.templateOptions);
  const {
    existingWorkflowName,
    connections: { mapping },
    subscriptionId,
    location,
  } = useSelector((state: RootState) => state.workflow);

  const templateTitle = useSelector((state: RootState) => state.template.manifest?.title);

  const intlText = {
    PLACEHOLDER: intl.formatMessage({
      defaultMessage: '----',
      id: 'wPi8wS',
      description: 'Accessibility label indicating that the value is not set',
    }),
    TEMPLATE_NAME: intl.formatMessage({
      defaultMessage: 'Template',
      id: '83Vrgj',
      description: 'Label for template',
    }),
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Workflow name',
      id: 'TdgpOf',
      description: 'Label for workflow name',
    }),
    AUTHENTICATION: intl.formatMessage({
      defaultMessage: 'Authentication',
      id: 'BHXsCs',
      description: 'Label for authentication',
    }),
    PARAMETER: intl.formatMessage({
      defaultMessage: 'Parameter',
      id: '0/OIcB',
      description: 'Label for parameter',
    }),
    VALUE: intl.formatMessage({
      defaultMessage: 'Value',
      id: 'YoMJq+',
      description: 'Label for value',
    }),
  };

  const styles = useStyles();

  return (
    <div className="msla-templates-tab msla-templates-review-container">
      <div className="msla-templates-review-block">
        <Text>{resourceOverrides?.templateName ?? intlText.TEMPLATE_NAME}</Text>
        <Text weight="semibold" className={styles.actionName}>
          {templateTitle}
        </Text>
      </div>

      <div className="msla-templates-review-block">
        <Text>{resourceOverrides?.workflowName ?? intlText.WORKFLOW_NAME}</Text>
        {Object.values(workflows).map((workflow) => (
          <Text weight="semibold" key={workflow.id}>
            {existingWorkflowName ?? workflow.workflowName}
          </Text>
        ))}
      </div>

      {enableResourceSelection && <ResourceDisplay />}

      <div className="msla-templates-review-block">
        <Text>{intlText.AUTHENTICATION}</Text>
        {Object.keys(connections).map((connectionKey) => (
          <CompactConnectorConnectionStatus
            key={connectionKey}
            connectorId={normalizeConnectorId(connections[connectionKey].connectorId ?? '', subscriptionId, location)}
            hasConnection={mapping[connectionKey] !== undefined}
          />
        ))}
      </div>

      <div className="msla-templates-review-block parameters">
        <Text>{intlText.PARAMETER}</Text>
        <Text>{intlText.VALUE}</Text>
        {Object.values(parameterDefinitions)?.map((parameter) => (
          <>
            <Text weight="semibold">{parameter.displayName}</Text>
            <Text>{parameter.value ?? intlText.PLACEHOLDER}</Text>
          </>
        ))}
      </div>
    </div>
  );
};
