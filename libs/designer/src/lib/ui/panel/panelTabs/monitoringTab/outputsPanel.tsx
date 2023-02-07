import { HostService, ContentType } from '@microsoft/designer-client-services-logic-apps';
import { ValuesPanel } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface OutputsPanelProps {
  runMetaData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  brandColor: string;
  nodeId: string;
  values: Record<string, any>;
}

export const OutputsPanel: React.FC<OutputsPanelProps> = ({ runMetaData, brandColor, nodeId, values }) => {
  const intl = useIntl();

  const intlText = {
    outputs: intl.formatMessage({
      defaultMessage: 'Outputs',
      description: 'Outputs text',
    }),
    noOutputs: intl.formatMessage({
      defaultMessage: 'No outputs',
      description: 'No utputs text',
    }),
    showOutputs: intl.formatMessage({
      defaultMessage: 'Show raw outputs',
      description: 'Show outputs text',
    }),
  };

  const { outputsLink } = runMetaData;

  const onSeeRawOutputsClick = (): void => {
    HostService().fetchAndDisplayContent(nodeId, outputsLink.uri, ContentType.Outputs);
  };

  return (
    <>
      {outputsLink ? (
        <ValuesPanel
          brandColor={brandColor}
          headerText={intlText.outputs}
          linkText={intlText.showOutputs}
          showLink={true}
          values={values}
          labelledBy={''}
          noValuesText={intlText.noOutputs}
          showMore={false}
          onLinkClick={onSeeRawOutputsClick}
        />
      ) : null}
    </>
  );
};
