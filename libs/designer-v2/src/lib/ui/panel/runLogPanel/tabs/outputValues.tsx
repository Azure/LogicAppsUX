import { HostService, ContentType, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { SecureDataSection } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { RunLogActionValues } from '../runLogActionValues';

export interface OutputValuesProps {
  runMetaData?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  nodeId: string;
  isLoading?: boolean;
  error?: any;
}

export const OutputValues: React.FC<OutputValuesProps> = ({ runMetaData, nodeId, isLoading, error }) => {
  const [showMore, setShowMore] = useState<boolean>(false);
  const intl = useIntl();
  const { outputsLink, outputs } = runMetaData ?? {};
  const { uri, secureData } = outputsLink ?? {};
  const areOutputsSecured = !isNullOrUndefined(secureData);

  const intlText = {
    outputs: intl.formatMessage({
      defaultMessage: 'Outputs',
      id: '0oebOm',
      description: 'Outputs text',
    }),
    showOutputs: intl.formatMessage({
      defaultMessage: 'Show raw outputs',
      id: '/mjH84',
      description: 'Show outputs text',
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
        <SecureDataSection brandColor={'transparent'} headerText={intlText.outputs} />
      ) : (
        <RunLogActionValues
          linkText={isNullOrUndefined(outputs) ? '' : intlText.showOutputs}
          showLink={!!uri}
          values={outputs ?? {}}
          isLoading={isLoading}
          error={error}
          showMore={showMore}
          onMoreClick={onMoreClick}
          onLinkClick={onSeeRawOutputsClick}
          isDownload={isNullOrUndefined(outputs)}
          link={uri}
        />
      )}
    </>
  );
};
