import { HostService, ContentType, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { RunLogActionValues } from '../runLogActionValues';
import { SecureDataSection } from '@microsoft/designer-ui';

export interface InputsPanelProps {
  runMetaData?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  nodeId: string;
  isLoading?: boolean;
  error?: any;
}

export const InputValues: React.FC<InputsPanelProps> = ({ runMetaData, nodeId, isLoading, error }) => {
  const [showMore, setShowMore] = useState<boolean>(false);
  const intl = useIntl();
  const { inputsLink, inputs } = runMetaData ?? {};
  const { uri, secureData } = inputsLink ?? {};
  const areInputsSecured = !isNullOrUndefined(secureData);

  const intlText = {
    inputs: intl.formatMessage({
      defaultMessage: 'Inputs',
      id: 'PORNMZ',
      description: 'Inputs text',
    }),
    showInputs: intl.formatMessage({
      defaultMessage: 'Show raw inputs',
      id: 'xSMbKr',
      description: 'Show inputs text',
    }),
  };

  const onSeeRawInputsClick = (): void => {
    if (!isNullOrUndefined(uri)) {
      HostService().fetchAndDisplayContent(nodeId, uri, ContentType.Inputs);
    }
  };

  const onMoreClick = () => {
    setShowMore((current) => !current);
  };

  return (
    <>
      {areInputsSecured ? (
        <SecureDataSection brandColor={'transparent'} headerText={intlText.inputs} />
      ) : (
        <RunLogActionValues
          linkText={isNullOrUndefined(inputs) ? '' : intlText.showInputs}
          showLink={!!uri}
          values={inputs ?? {}}
          isLoading={isLoading}
          error={error}
          showMore={showMore}
          onMoreClick={onMoreClick}
          onLinkClick={onSeeRawInputsClick}
          isDownload={isNullOrUndefined(inputs)}
          link={uri}
        />
      )}
    </>
  );
};
