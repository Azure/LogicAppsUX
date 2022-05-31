import { ValuesPanel } from '../valuespanel';
import { useIntl } from 'react-intl';

export interface MonitoringPanelProps {
  test?: boolean;
}

export const MonitoringPanel: React.FC<MonitoringPanelProps> = () => {
  // const intl = useIntl();

  return (
    <div>
      <ValuesPanel
        headerText="Inputs"
        linkText="Show inputs"
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
        noValuesText={'No inputs'}
        showMore={false}
      />
      <ValuesPanel
        headerText="Outputs"
        linkText="Show outputs"
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
        noValuesText={'No outputs'}
        showMore={false}
      />
      <ValuesPanel
        headerText="Properties"
        values={{
          startTime: {
            displayName: 'Start time',
            value: 'Fri, 28 Jan 2022 00:02:51 GMT',
          },
        }}
        labelledBy={''}
        noValuesText={'No properties'}
        showMore={false}
      />
    </div>
  );
};
