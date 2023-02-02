import { ValuesPanel } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface OutputsPanelProps {
  runMetaData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger | undefined;
  brandColor?: string;
  onSeeRawOutputsClick?(): void;
}

export const OutputsPanel: React.FC<OutputsPanelProps> = ({ runMetaData, brandColor, onSeeRawOutputsClick }) => {
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

  return (
    <>
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
          onLinkClick={onSeeRawOutputsClick}
        />
      ) : null}
    </>
  );
};
