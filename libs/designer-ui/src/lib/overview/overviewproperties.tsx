import { Label, Link, Pivot, PivotItem } from '@fluentui/react';
import { Text } from '@fluentui/react-components';
import { getCallbackUrl, getIsCallbackUrlSupported } from '@microsoft/logic-apps-shared';
import type { CallbackInfo, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

export interface OverviewPropertiesProps {
  callbackInfo?: CallbackInfo;
  name: string;
  operationOptions?: string;
  statelessRunMode?: string;
  stateType: string;
  triggerName?: string;
  definition?: LogicAppsV2.WorkflowDefinition;
}

export const OverviewProperties: React.FC<OverviewPropertiesProps> = ({
  callbackInfo,
  name,
  operationOptions,
  statelessRunMode,
  stateType,
  definition,
}) => {
  const intl = useIntl();
  const callbackUrl = useMemo(() => {
    const { isCallbackUrlSupported = false } = definition ? getIsCallbackUrlSupported(definition) : {};
    return isCallbackUrlSupported ? getCallbackUrl(callbackInfo) : undefined;
  }, [callbackInfo, definition]);

  const Resources = {
    CALLBACK_URL: intl.formatMessage({
      defaultMessage: 'Callback URL:',
      id: 'c2825086f819',
      description: 'Label text for callback URL',
    }),
    FLOW_STATE_TYPE: intl.formatMessage({
      defaultMessage: 'State type:',
      id: '067f224d2a29',
      description: 'Label text for workflow state type (Stateless or Stateful)',
    }),
    STATELESS_RUN_MODE: intl.formatMessage({
      defaultMessage: 'Stateless run mode:',
      id: '960b39b1fb01',
      description: 'label text for stateless run mode',
    }),
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Name:',
      id: '26795c650ca4',
      description: 'Label text for workflow name',
    }),
    WORKFLOW_OPERATION_OPTIONS: intl.formatMessage({
      defaultMessage: 'Operation options:',
      id: '385299cd0432',
      description: 'Label text for workflow operation options',
    }),
    WORKFLOW_PROPERTIES: intl.formatMessage({
      defaultMessage: 'Workflow properties',
      id: '38cb8c0881e5',
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
