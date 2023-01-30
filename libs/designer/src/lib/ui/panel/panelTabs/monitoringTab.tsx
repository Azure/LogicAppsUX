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

  const inputsText = intl.formatMessage({
    defaultMessage: 'Inputs',
    description: 'Inputs text',
  });

  const showInputsText = intl.formatMessage({
    defaultMessage: 'Show inputs',
    description: 'Show inputs text',
  });

  const outputsText = intl.formatMessage({
    defaultMessage: 'Outputs',
    description: 'Outputs text',
  });

  const showOutputsText = intl.formatMessage({
    defaultMessage: 'Show outputs',
    description: 'Show outputs text',
  });

  const propertiesText = intl.formatMessage({
    defaultMessage: 'Properties',
    description: 'Properties text',
  });

  return (
    <div>
      {runMetaData?.inputsLink ? (
        <ValuesPanel
          brandColor={brandColor}
          headerText={inputsText}
          linkText={showInputsText}
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
      {runMetaData?.inputsLink ? (
        <ValuesPanel
          brandColor={brandColor}
          headerText={outputsText}
          linkText={showOutputsText}
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
        headerText={propertiesText}
        values={{
          startTime: {
            displayName: 'Start time',
            value: 'Fri, 28 Jan 2022 00:02:51 GMT',
          },
        }}
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
