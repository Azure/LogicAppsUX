import constants from '../../../common/constants';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { useBrandColor } from '../../../core/state/selectors/actionMetadataSelector';
import { useNodeMetadata } from '../../../core/state/workflow/workflowSelectors';
import { ValuesPanel } from '@microsoft/designer-ui';
import type { PanelTab } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

// Dummy props for now, unsure of the data structure at the moment
export interface MonitoringPanelProps {
  inputData?: any;
  outputData?: any;
  propertiesData?: any;
}

export const MonitoringPanel: React.FC<MonitoringPanelProps> = () => {
  const intl = useIntl();
  const selectedNodeId = useSelectedNodeId();
  const nodeMetadata = useNodeMetadata(selectedNodeId);
  const brandColor = useBrandColor(selectedNodeId);
  const runMetaData = nodeMetadata?.runData;

  const intlText = {
    inputs: intl.formatMessage({
      defaultMessage: 'Inputs',
      description: 'Inputs text',
    }),
    showInputs: intl.formatMessage({
      defaultMessage: 'Show inputs',
      description: 'Show inputs text',
    }),
    outputs: intl.formatMessage({
      defaultMessage: 'Outputs',
      description: 'Outputs text',
    }),
    showOutputs: intl.formatMessage({
      defaultMessage: 'Show outputs',
      description: 'Show outputs text',
    }),
    properties: intl.formatMessage({
      defaultMessage: 'Properties',
      description: 'Properties text',
    }),
    startTime: intl.formatMessage({
      defaultMessage: 'Start time',
      description: 'Start time text',
    }),
    endTime: intl.formatMessage({
      defaultMessage: 'End time',
      description: 'End time text',
    }),
    status: intl.formatMessage({
      defaultMessage: 'Status',
      description: 'Status text',
    }),
    clienTrackingId: intl.formatMessage({
      defaultMessage: 'Client Tracking ID',
      description: 'Client Tracking ID text',
    }),
    actionTrackingId: intl.formatMessage({
      defaultMessage: 'Action Tracking ID',
      description: 'Action Tracking ID text',
    }),
  };

  const runProperties = {
    startTime: {
      displayName: intlText.startTime,
      value: 'Fri, 28 Jan 2022 00:02:51 GMT',
    },
    endTime: {
      displayName: intlText.endTime,
      value: 'Fri, 28 Jan 2022 00:02:51 GMT',
    },
    status: {
      displayName: intlText.status,
      value: 'Fri, 28 Jan 2022 00:02:51 GMT',
    },
    clienTrackingId: {
      displayName: intlText.clienTrackingId,
      value: 'Fri, 28 Jan 2022 00:02:51 GMT',
    },
    actionTrackingId: {
      displayName: intlText.actionTrackingId,
      value: 'Fri, 28 Jan 2022 00:02:51 GMT',
    },
  };

  return (
    <div>
      {runMetaData?.inputsLink ? (
        <ValuesPanel
          brandColor={brandColor}
          headerText={intlText.inputs}
          linkText={intlText.showInputs}
          showLink={true}
          values={{
            method: {
              displayName: 'Method',
              value: 'POST',
            },
            uri: {
              displayName: 'URL',
              value: 'https://httpbin.org/post/',
            },
          }}
          labelledBy={''}
          noValuesText={'No inputs'}
          showMore={false}
        />
      ) : null}
      {runMetaData?.outputsLink ? (
        <ValuesPanel
          brandColor={brandColor}
          headerText={intlText.outputs}
          linkText={intlText.showOutputs}
          showLink={true}
          values={{
            statusCode: {
              displayName: 'Status code',
              value: 200,
            },
            headers: {
              displayName: 'Headers',
              format: 'key-value-pairs',
              value: {
                Date: 'Fri, 28 Jan 2022 00:02:51 GMT',
                Expires: '-1',
                Pragma: 'no-cache',
                Vary: 'Accept-Encoding',
              },
            },
            body: {
              displayName: 'Body',
              value: {
                nextLink: '[REDACTED]',
                value: [],
              },
            },
          }}
          labelledBy={''}
          noValuesText={'No outputs'}
          showMore={false}
        />
      ) : null}
      <ValuesPanel
        brandColor={brandColor}
        headerText={intlText.properties}
        values={runProperties}
        labelledBy={''}
        noValuesText={'No properties'}
        showMore={false}
      />
    </div>
  );
};

export const monitoringTab: PanelTab = {
  title: 'Monitoring',
  name: constants.PANEL_TAB_NAMES.MONITORING,
  description: 'Monitoring View Tab',
  visible: true,
  content: <MonitoringPanel />,
  order: 0,
  icon: 'Info',
};
