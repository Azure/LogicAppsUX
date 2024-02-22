import { Label, Link, Pivot, PivotItem, Text } from '@fluentui/react';
import { getCallbackUrl } from '@microsoft/logic-apps-shared';
import type { Callback } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

export interface OverviewPropertiesProps {
  callbackInfo?: Callback;
  name: string;
  operationOptions?: string;
  statelessRunMode?: string;
  stateType: string;
}

export const OverviewProperties: React.FC<OverviewPropertiesProps> = ({
  callbackInfo,
  name,
  operationOptions,
  statelessRunMode,
  stateType,
}) => {
  const intl = useIntl();
  const callbackUrl = useMemo(() => getCallbackUrl(callbackInfo), [callbackInfo]);

  const Resources = {
    CALLBACK_URL: intl.formatMessage({
      defaultMessage: 'Callback URL:',
      description: 'Label text for callback URL',
    }),
    FLOW_STATE_TYPE: intl.formatMessage({
      defaultMessage: 'State type:',
      description: 'Label text for workflow state type (Stateless or Stateful)',
    }),
    STATELESS_RUN_MODE: intl.formatMessage({
      defaultMessage: 'Stateless run mode:',
      description: 'label text for stateless run mode',
    }),
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Name:',
      description: 'Label text for workflow name',
    }),
    WORKFLOW_OPERATION_OPTIONS: intl.formatMessage({
      defaultMessage: 'Operation options:',
      description: 'Label text for workflow operation options',
    }),
    WORKFLOW_PROPERTIES: intl.formatMessage({
      defaultMessage: 'Workflow Properties',
      description: 'Header text for workflow properties',
    }),
  };

  return (
    <Pivot>
      <PivotItem headerText={Resources.WORKFLOW_PROPERTIES}>
        <div className="msla-workflow-properties">
          <Label>
            <Text>{Resources.WORKFLOW_NAME}</Text>
            <Text>{name}</Text>
          </Label>
          <Label>
            <Text>{Resources.FLOW_STATE_TYPE}</Text>
            <Text>{stateType}</Text>
          </Label>
          {operationOptions ? (
            <Label>
              <Text>{Resources.WORKFLOW_OPERATION_OPTIONS}</Text>
              <Text>{operationOptions}</Text>
            </Label>
          ) : null}
          {statelessRunMode ? (
            <Label>
              <Text>{Resources.STATELESS_RUN_MODE}</Text>
              <Text>{statelessRunMode}</Text>
            </Label>
          ) : null}
          {callbackUrl ? (
            <Label>
              <Text>{Resources.CALLBACK_URL}</Text>
              <div>
                <Link as="a" href={callbackUrl} rel="noopener" target="_blank">
                  {callbackUrl}
                </Link>
              </div>
            </Label>
          ) : null}
        </div>
      </PivotItem>
    </Pivot>
  );
};
