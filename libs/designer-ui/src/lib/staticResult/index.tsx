import { Toggle } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface TestingProps {
  enabled?: boolean;
}

export const StaticResult = ({ enabled }: TestingProps): JSX.Element => {
  const intl = useIntl();

  const toggleLabelOn = intl.formatMessage({
    defaultMessage: 'Disable Static Result',
    description: 'Label for toggle to disable static result',
  });

  const toggleLabelOff = intl.formatMessage({
    defaultMessage: 'Enable Static Result',
    description: 'Label for toggle to enable static result',
  });

  const getLabel = () => {
    return enabled ? toggleLabelOn : toggleLabelOff;
  };

  return (
    <div className="msla-panel-testing-container">
      <Toggle
        label={getLabel()}
        onChange={() => {
          console.log('toggle');
        }}
      />
    </div>
  );
};
