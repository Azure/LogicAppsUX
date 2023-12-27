import { Checkbox } from '@fluentui/react';
import { Tooltip } from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

export interface LegacyGatewayCheckboxProps {
  isLoading: boolean;
  value: boolean;
  onChange: () => void;
}

const LegacyGatewayCheckbox = ({ isLoading, value, onChange }: LegacyGatewayCheckboxProps) => {
  const intl = useIntl();
  const gatewayLabelText = intl.formatMessage({
    defaultMessage: 'Connect via on-premises data gateway',
    description: 'Checkbox label for using an on-premises gateway',
  });
  const gatewayTooltipText = intl.formatMessage({
    defaultMessage: "Select this checkbox if you're setting up an on-premises connection.",
    description: 'Tooltip for the on-premises data gateway connection checkbox',
  });

  return (
    <div className="param-row center" style={{ margin: '8px 0px' }}>
      <Checkbox label={gatewayLabelText} disabled={isLoading} checked={value} onChange={onChange} />
      <Tooltip relationship="label" withArrow content={gatewayTooltipText}>
        <Info16Regular style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
      </Tooltip>
    </div>
  );
};

export default LegacyGatewayCheckbox;
