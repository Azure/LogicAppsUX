import { HostService, ContentType } from '@microsoft/designer-client-services-logic-apps';
import { ValuesPanel } from '@microsoft/designer-ui';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface OutputsPanelProps {
  runMetaData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  brandColor: string;
  nodeId: string;
  values: Record<string, any>;
  isLoading: boolean;
  isError: boolean;
}

export const OutputsPanel: React.FC<OutputsPanelProps> = ({ runMetaData, brandColor, nodeId, values, isLoading, isError }) => {
  const [showMore, setShowMore] = useState<boolean>(false);
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
    outputsLoading: intl.formatMessage({
      defaultMessage: 'Loading outputs',
      description: 'Loading outputs text',
    }),
    outputsError: intl.formatMessage({
      defaultMessage: 'Error loading outputs',
      description: 'Error loading outputs text',
    }),
  };

  const { outputsLink } = runMetaData;

  const onSeeRawOutputsClick = (): void => {
    HostService().fetchAndDisplayContent(nodeId, outputsLink.uri, ContentType.Outputs);
  };

  const onMoreClick = () => {
    setShowMore((current) => !current);
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
          labelledBy={`outputs-${nodeId}`}
          noValuesText={isError ? intlText.outputsError : isLoading ? intlText.outputsLoading : intlText.noOutputs}
          showMore={showMore}
          onMoreClick={onMoreClick}
          onLinkClick={onSeeRawOutputsClick}
        />
      ) : null}
    </>
  );
};
