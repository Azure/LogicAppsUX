import { HostService, ContentType, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { SecureDataSection, ValuesPanel } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface InputsPanelProps {
  runMetaData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  brandColor: string;
  nodeId: string;
  isLoading: boolean;
  isError: boolean;
}

export const InputsPanel: React.FC<InputsPanelProps> = ({ runMetaData, brandColor, nodeId, isLoading, isError }) => {
  const [showMore, setShowMore] = useState<boolean>(false);
  const intl = useIntl();
  const { inputsLink, inputs } = runMetaData;
  const { uri, secureData } = inputsLink ?? {};
  const areInputsSecured = !isNullOrUndefined(secureData);

  const intlText = {
    inputs: intl.formatMessage({
      defaultMessage: 'Inputs',
      id: 'PORNMZ',
      description: 'Inputs text',
    }),
    noInputs: intl.formatMessage({
      defaultMessage: 'No inputs',
      id: '7Fyq1F',
      description: 'No inputs text',
    }),
    showInputs: intl.formatMessage({
      defaultMessage: 'Show raw inputs',
      id: 'xSMbKr',
      description: 'Show inputs text',
    }),
    inputsLoading: intl.formatMessage({
      defaultMessage: 'Loading inputs',
      id: 'xwD1VZ',
      description: 'Loading inputs text',
    }),
    inputsError: intl.formatMessage({
      defaultMessage: 'Error loading inputs',
      id: '63CC7M',
      description: 'The text for the loading inputs error.',
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
        <SecureDataSection brandColor={brandColor} headerText={intlText.inputs} />
      ) : inputsLink ? (
        <ValuesPanel
          brandColor={brandColor}
          headerText={intlText.inputs}
          linkText={isNullOrUndefined(inputs) ? '' : intlText.showInputs}
          showLink={!!uri}
          values={inputs ?? {}}
          labelledBy={`inputs-${nodeId}`}
          noValuesText={isError ? intlText.inputsError : isLoading ? intlText.inputsLoading : intlText.noInputs}
          showMore={showMore}
          onMoreClick={onMoreClick}
          onLinkClick={onSeeRawInputsClick}
          isDownload={isNullOrUndefined(inputs)}
          link={uri}
        />
      ) : null}
    </>
  );
};
