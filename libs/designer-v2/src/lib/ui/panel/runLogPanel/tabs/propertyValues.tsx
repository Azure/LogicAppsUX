import constants from '../../../../common/constants';
import { getStatusString } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { isNullOrEmpty } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { RunLogActionValues } from '../runLogActionValues';

export interface PropertyValuesProps {
  properties?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
}

export const PropertyValues: React.FC<PropertyValuesProps> = ({ properties }) => {
  const intl = useIntl();

  const intlText = {
    properties: intl.formatMessage({
      defaultMessage: 'Properties',
      id: '/n13VL',
      description: 'Properties text',
    }),
    startTime: intl.formatMessage({
      defaultMessage: 'Start time',
      id: '6ueRYm',
      description: 'Start time text',
    }),
    endTime: intl.formatMessage({
      defaultMessage: 'End time',
      id: 'nOWGAV',
      description: 'End time text',
    }),
    status: intl.formatMessage({
      defaultMessage: 'Status',
      id: 'ZBJiuD',
      description: 'Status text',
    }),
    clienTrackingId: intl.formatMessage({
      defaultMessage: 'Client tracking ID',
      id: '5we9SR',
      description: 'Client Tracking ID text',
    }),
    actionTrackingId: intl.formatMessage({
      defaultMessage: 'Action tracking ID',
      id: 'lSUNx5',
      description: 'Action Tracking ID text',
    }),
  };

  const makeValuesFromOperationProperties = (properties: any, hasRetries: boolean) => {
    if (isNullOrEmpty(properties)) {
      return {};
    }

    const { correlation, endTime, startTime, status } = properties;

    return {
      ...(startTime && {
        startTime: {
          displayName: intlText.startTime,
          format: constants.SWAGGER.FORMAT.DATETIME,
          value: startTime,
        },
      }),
      ...(endTime && {
        endTime: {
          displayName: intlText.endTime,
          format: constants.SWAGGER.FORMAT.DATETIME,
          value: endTime,
        },
      }),
      status: {
        displayName: intlText.status,
        value: getStatusString(status, hasRetries),
      },
      ...(correlation &&
        correlation.clientTrackingId && {
          clientTrackingId: {
            displayName: intlText.clienTrackingId,
            value: correlation.clientTrackingId,
          },
        }),
      ...(correlation &&
        correlation.actionTrackingId && {
          actionTrackingId: {
            displayName: intlText.actionTrackingId,
            value: correlation.actionTrackingId,
          },
        }),
    };
  };

  const runProperties = makeValuesFromOperationProperties(properties, false);

  return <RunLogActionValues values={runProperties} showMore={false} />;
};
