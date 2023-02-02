import { ValuesPanel } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface InputsPanelProps {
  runMetaData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger | undefined;
  brandColor?: string;
  onSeeRawInputsClick?(): void;
}

export const InputsPanel: React.FC<InputsPanelProps> = ({ runMetaData, brandColor, onSeeRawInputsClick }) => {
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
  };

  return (
    <>
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
          noValuesText={intlText.noInputs}
          showMore={false}
          onLinkClick={onSeeRawInputsClick}
        />
      ) : null}
    </>
  );
};
