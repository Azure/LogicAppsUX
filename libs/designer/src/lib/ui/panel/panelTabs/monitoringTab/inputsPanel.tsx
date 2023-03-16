import { HostService, ContentType } from '@microsoft/designer-client-services-logic-apps';
import { ValuesPanel } from '@microsoft/designer-ui';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface InputsPanelProps {
  runMetaData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  brandColor: string;
  nodeId: string;
  values: Record<string, any>;
  isLoading: boolean;
  isError: boolean;
}

export const InputsPanel: React.FC<InputsPanelProps> = ({ runMetaData, brandColor, nodeId, values, isLoading, isError }) => {
  const [showMore, setShowMore] = useState<boolean>(false);
  const intl = useIntl();

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
      defaultMessage: 'Show raw inputs',
      description: 'Show inputs text',
    }),
    inputsLoading: intl.formatMessage({
      defaultMessage: 'Loading inputs',
      description: 'Loading inputs text',
    }),
    inputsError: intl.formatMessage({
      defaultMessage: 'Error loading inputs',
      description: 'Error loading inputs text',
    }),
  };

  const { inputsLink } = runMetaData;

  const onSeeRawInputsClick = (): void => {
    HostService().fetchAndDisplayContent(nodeId, inputsLink.uri, ContentType.Inputs);
  };

  const onMoreClick = () => {
    setShowMore((current) => !current);
  };

  return (
    <>
      {inputsLink ? (
        <ValuesPanel
          brandColor={brandColor}
          headerText={intlText.inputs}
          linkText={intlText.showInputs}
          showLink={true}
          values={values}
          labelledBy={`inputs-${nodeId}`}
          noValuesText={isError ? intlText.inputsError : isLoading ? intlText.inputsLoading : intlText.noInputs}
          showMore={showMore}
          onMoreClick={onMoreClick}
          onLinkClick={onSeeRawInputsClick}
        />
      ) : null}
    </>
  );
};
