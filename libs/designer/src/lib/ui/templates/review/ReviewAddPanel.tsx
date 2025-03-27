import type { RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { Text } from '@fluentui/react-components';
import { useSelector } from 'react-redux';
import { normalizeConnectorId } from '@microsoft/logic-apps-shared';
import { CompactConnectorConnectionStatus } from '../connections/connector';
import { ResourceDisplay } from './ResourceDisplay';
import { useTemplatesStrings } from '../templatesStrings';
import {
  useTemplateWorkflows,
  useTemplateConnections,
  useTemplateParameterDefinitions,
} from '../../../core/state/templates/templateselectors';
import { useMemo } from 'react';
import { TemplateDisplay } from '../templateDisplay';

type ReviewCreatePanelProps = {
  resourceOverrides?: {
    templateName?: string;
    workflowName?: string;
  };
};

export const ReviewAddPanel = ({ resourceOverrides }: ReviewCreatePanelProps) => {
  const intl = useIntl();
  const workflows = useTemplateWorkflows();
  const connections = useTemplateConnections();
  const parameterDefinitions = useTemplateParameterDefinitions();
  const { enableResourceSelection } = useSelector((state: RootState) => state.templateOptions);
  const {
    connections: { mapping },
    subscriptionId,
    location,
  } = useSelector((state: RootState) => state.workflow);
  const { resourceStrings } = useTemplatesStrings();

  const intlText = {
    PLACEHOLDER: intl.formatMessage({
      defaultMessage: '----',
      id: 'wPi8wS',
      description: 'Accessibility label indicating that the value is not set',
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

  const templateHasConnections = useMemo(() => Object.keys(connections).length > 0, [connections]);
  const templateHasParameters = useMemo(() => Object.keys(parameterDefinitions).length > 0, [parameterDefinitions]);

  return (
    <div className="msla-templates-tab msla-templates-review-container">
      <TemplateDisplay titleLabel={resourceOverrides?.templateName} showDescription />

      <div className="msla-templates-review-block">
        <Text>{resourceOverrides?.workflowName ?? resourceStrings.WORKFLOW_NAME}</Text>
        {Object.values(workflows).map((workflow) => (
          <Text weight="semibold" key={workflow.id}>
            {workflow.workflowName}
          </Text>
        ))}
      </div>

      {enableResourceSelection && <ResourceDisplay />}

      {templateHasConnections && (
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
      )}

      {templateHasParameters && (
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
      )}
    </div>
  );
};
