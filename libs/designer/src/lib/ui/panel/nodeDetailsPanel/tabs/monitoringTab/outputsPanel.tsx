import { HostService, ContentType } from '@microsoft/logic-apps-shared';
import { ValuesPanel, SecureDataSection } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
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
  const { outputsLink } = runMetaData;
  const { uri, secureData } = outputsLink ?? {};
  const areOutputsSecured = !isNullOrUndefined(secureData);

  const intlText = {
    outputs: intl.formatMessage({
      defaultMessage: 'Outputs',
      description: 'Outputs text',
    }),
    noOutputs: intl.formatMessage({
      defaultMessage: 'No outputs',
      description: 'No outputs text',
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

  const onSeeRawOutputsClick = (): void => {
    if (!isNullOrUndefined(uri)) {
      HostService().fetchAndDisplayContent(nodeId, uri, ContentType.Outputs);
    }
  };

  const onMoreClick = () => {
    setShowMore((current) => !current);
  };

  return (
    <>
      {areOutputsSecured ? (
        <SecureDataSection brandColor={brandColor} headerText={intlText.outputs} />
      ) : outputsLink ? (
        <ValuesPanel
          brandColor={brandColor}
          headerText={intlText.outputs}
          linkText={isNullOrUndefined(values) ? '' : intlText.showOutputs}
          showLink={!!uri}
          values={values}
          labelledBy={`outputs-${nodeId}`}
          noValuesText={isError ? intlText.outputsError : isLoading ? intlText.outputsLoading : intlText.noOutputs}
          showMore={showMore}
          onMoreClick={onMoreClick}
          onLinkClick={onSeeRawOutputsClick}
          isDownload={isNullOrUndefined(values)}
          link={uri}
        />
      ) : null}
    </>
  );
};
