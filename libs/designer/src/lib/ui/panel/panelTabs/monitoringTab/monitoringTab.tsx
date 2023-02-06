import constants from '../../../../common/constants';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useBrandColor } from '../../../../core/state/selectors/actionMetadataSelector';
import { useNodeMetadata } from '../../../../core/state/workflow/workflowSelectors';
import { PropertiesPanel } from './propertiesPanel';
import { RunService } from '@microsoft/designer-client-services-logic-apps';
import { ValuesPanel } from '@microsoft/designer-ui';
import type { PanelTab } from '@microsoft/designer-ui';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export const MonitoringPanel: React.FC = () => {
  const intl = useIntl();
  const selectedNodeId = useSelectedNodeId();
  const nodeMetadata = useNodeMetadata(selectedNodeId);
  const brandColor = useBrandColor(selectedNodeId);
  const runMetaData = nodeMetadata?.runData;
  const [inputOutputs, setInputsOutputs] = useState({ inputs: null, outputs: null });

  useEffect(() => {
    async function getActionInputsOutputs() {
      const actionsInputsOutputs = await RunService().getActionLink(runMetaData);
      setInputsOutputs(actionsInputsOutputs);
    }
    getActionInputsOutputs();
  }, [runMetaData]);

  console.log(inputOutputs);

  const intlText = {
    inputs: intl.formatMessage({
      defaultMessage: 'Inputs',
      description: 'Inputs text',
    }),
    noInputs: intl.formatMessage({
      defaultMessage: 'No inputs',
      description: 'No inputs text',
    }),
    showInputs: intl.formatMessage({
      defaultMessage: 'Show inputs',
      description: 'Show inputs text',
    }),
    outputs: intl.formatMessage({
      defaultMessage: 'Outputs',
      description: 'Outputs text',
    }),
    noOutputs: intl.formatMessage({
      defaultMessage: 'No outputs',
      description: 'No utputs text',
    }),
    showOutputs: intl.formatMessage({
      defaultMessage: 'Show outputs',
      description: 'Show outputs text',
    }),
  };

  return (
    <div>
      {runMetaData?.inputsLink ? (
        <ValuesPanel
          brandColor={brandColor}
          headerText={intlText.inputs}
          linkText={intlText.showInputs}
          showLink={true}
          values={inputOutputs.inputs ?? {}}
          labelledBy={''}
          noValuesText={intlText.noInputs}
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
          noValuesText={intlText.noOutputs}
          showMore={false}
        />
      ) : null}
      <PropertiesPanel properties={runMetaData} brandColor={brandColor} />
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
